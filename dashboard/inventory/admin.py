"""Django-admin — the whole dashboard.

Staff land on the Product changelist (see config/urls.py). Two buttons at the top
regenerate storage; bulk actions cover force-republish / unpublish / delete.
"""

import json

from adminsortable2.admin import SortableAdminBase, SortableStackedInline
from django import forms
from django.contrib import admin, messages
from django.db.models import Max
from django.http import HttpResponseNotAllowed
from django.shortcuts import redirect
from django.urls import path
from django.utils.html import format_html

from . import publisher
from .models import Category, DeletedProduct, Product, ProductImage, ProductVideo, PublishRun


# --------------------------------------------------------- multi-file upload ----

class _MultiFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True


class _MultiFileField(forms.FileField):
    """A FileField that accepts <input multiple> and cleans to a list of files."""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", _MultiFileInput(attrs={"multiple": True}))
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single = super().clean
        if not data:
            return []
        return [single(d, initial) for d in (data if isinstance(data, (list, tuple)) else [data])]


class ProductAdminForm(forms.ModelForm):
    bulk_images = _MultiFileField(
        required=False,
        label="Add images",
        help_text="Pick several files at once (or drag them here) — each is appended to the gallery.",
    )
    bulk_videos = _MultiFileField(required=False, label="Add videos")

    class Meta:
        model = Product
        fields = "__all__"


# ------------------------------------------------------------------ filters ----

class TagListFilter(admin.SimpleListFilter):
    title = "tag"
    parameter_name = "tag"

    def lookups(self, request, model_admin):
        from taggit.models import Tag

        names = Tag.objects.filter(taggit_taggeditem_items__isnull=False).values_list("name", flat=True)
        return sorted({(n, n) for n in names})

    def queryset(self, request, queryset):
        return queryset.filter(tags__name=self.value()) if self.value() else queryset


# ------------------------------------------------------------------ inlines ----

class _InlineAssets:
    css = {"all": ["inventory/admin/media-inline.css"]}
    js = ["inventory/admin/media-inline.js"]


class ProductImageInline(SortableStackedInline):
    model = ProductImage
    extra = 0
    fields = ("preview", "image", "alt")
    readonly_fields = ("preview",)
    ordering = ("order", "id")  # `order` = drag position (managed by adminsortable2)
    Media = _InlineAssets

    @admin.display(description="preview")
    def preview(self, obj):
        if obj.pk and obj.image:
            return format_html('<img src="{}" style="max-height:120px;border-radius:4px">', obj.image.url)
        return "—"


class ProductVideoInline(SortableStackedInline):
    model = ProductVideo
    extra = 0
    fields = ("video", "alt")
    ordering = ("order", "id")
    Media = _InlineAssets


# ------------------------------------------------------------------ product ----

@admin.register(Product)
class ProductAdmin(SortableAdminBase, admin.ModelAdmin):
    change_list_template = "admin/inventory/product/change_list.html"
    form = ProductAdminForm
    save_on_top = True

    list_display = ("name", "slug", "price_from", "shape", "style", "category", "is_published", "dirty", "last_published_at")
    list_display_links = ("name", "slug")
    list_editable = ("is_published",)
    list_filter = ("is_published", "category", "shape", "style", TagListFilter)
    search_fields = ("name", "slug", "descriptor", "subtitle", "description")
    ordering = ("-sort_weight", "name")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductImageInline, ProductVideoInline]
    readonly_fields = ("created_at", "updated_at", "last_published_at", "dirty")
    list_select_related = ("category",)
    actions = ["publish_selected", "republish_selected", "unpublish_selected"]

    fieldsets = (
        ("Basics", {"fields": ("name", "slug", "descriptor", "subtitle", "description")}),
        ("Catalog", {"fields": (
            "price_from", "shape", "style", "centre_carat_shown", "category", "tags",
            "sort_weight", "is_published",
        )}),
        ("Add media", {
            "fields": ("bulk_images", "bulk_videos"),
            "description": "Upload many files at once; each becomes a gallery item, appended after "
                           "the current ones. Reorder / delete them in the sections below.",
        }),
        ("Rich PDP payload", {
            "classes": ("collapse",),
            "description": "Merged verbatim into products/&lt;id&gt;.json — price_breakup, "
                           "specifications, trust_line, metals, related, …",
            "fields": ("pdp_extra",),
        }),
        ("Publish state", {"fields": ("dirty", "last_published_at", "created_at", "updated_at")}),
    )

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        self._save_bulk(form.instance, form.cleaned_data.get("bulk_images"), ProductImage, "image")
        self._save_bulk(form.instance, form.cleaned_data.get("bulk_videos"), ProductVideo, "video")

    @staticmethod
    def _save_bulk(product, files, model, field):
        if not files:
            return
        last = model.objects.filter(product=product).aggregate(m=Max("order"))["m"]
        start = 0 if last is None else last + 1
        for i, f in enumerate(files):
            model.objects.create(product=product, order=start + i, **{field: f})

    @admin.display(boolean=True, description="unpublished changes")
    def dirty(self, obj):
        return obj.is_dirty

    # -- top-of-list buttons ------------------------------------------------

    def get_urls(self):
        mine = [
            path("refresh-inventory/", self.admin_site.admin_view(self.refresh_view),
                 name="inventory_product_refresh"),
            path("publish-changes/", self.admin_site.admin_view(self.publish_view),
                 name="inventory_product_publish"),
        ]
        return mine + super().get_urls()

    def changelist_view(self, request, extra_context=None):
        last = PublishRun.objects.first()
        extra_context = {
            **(extra_context or {}),
            "last_run": last,
            "publish_running": PublishRun.is_running(),
        }
        return super().changelist_view(request, extra_context)

    def refresh_view(self, request):
        return self._run(request, "refresh")

    def publish_view(self, request):
        return self._run(request, "publish")

    def _run(self, request, kind):
        if request.method != "POST":
            return HttpResponseNotAllowed(["POST"])
        if PublishRun.is_running():
            self.message_user(request, "A publish run is already in progress — try again shortly.", messages.WARNING)
            return redirect("admin:inventory_product_changelist")
        try:
            run = publisher.run_job(kind, log=lambda *_a, **_k: None)
        except Exception as exc:  # noqa: BLE001
            self.message_user(request, f"{'Refresh' if kind == 'refresh' else 'Publish'} failed — {exc}", messages.ERROR)
            return redirect("admin:inventory_product_changelist")
        summary = json.loads(run.summary)
        verb = "Refreshed complete inventory" if kind == "refresh" else "Published inventory changes"
        self.message_user(
            request,
            f"{verb}: {summary.get('published', 0)} product(s) written, "
            f"{summary.get('removed_files', 0)} file(s) removed → {summary.get('dest', '')}",
            messages.SUCCESS,
        )
        return redirect("admin:inventory_product_changelist")

    # -- bulk actions -----------------------------------------------------

    def _bulk_publish(self, request, queryset, *, set_published=None, force=False, label=""):
        n = queryset.count()
        if set_published is not None:
            queryset.update(is_published=set_published)
        if force:
            queryset.update(last_published_at=None)
        try:
            publisher.run_job("publish", log=lambda *_a, **_k: None)
        except Exception as exc:  # noqa: BLE001
            self.message_user(request, f"{label} — publish failed: {exc}", messages.ERROR)
            return
        self.message_user(request, f"{label}: {n} product(s) processed and storage updated.", messages.SUCCESS)

    @admin.action(description="Publish selected (mark published & push)")
    def publish_selected(self, request, queryset):
        self._bulk_publish(request, queryset, set_published=True, force=True, label="Published")

    @admin.action(description="Re-publish selected (force push)")
    def republish_selected(self, request, queryset):
        self._bulk_publish(request, queryset, force=True, label="Re-published")

    @admin.action(description="Unpublish selected (remove from storage)")
    def unpublish_selected(self, request, queryset):
        self._bulk_publish(request, queryset, set_published=False, label="Unpublished")


# --------------------------------------------------------------- other models --

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "sort_order")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort_order", "name")


@admin.register(PublishRun)
class PublishRunAdmin(admin.ModelAdmin):
    list_display = ("kind", "status", "started_at", "finished_at")
    list_filter = ("kind", "status")
    readonly_fields = ("kind", "status", "started_at", "finished_at", "summary")

    def has_add_permission(self, request):
        return False


@admin.register(DeletedProduct)
class DeletedProductAdmin(admin.ModelAdmin):
    list_display = ("slug", "was_published", "deleted_at")
    readonly_fields = ("slug", "was_published", "deleted_at")

    def has_add_permission(self, request):
        return False
