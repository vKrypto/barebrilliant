"""URL routing.

`/`         -> the product changelist (staff land straight on the inventory list)
`/admin/`   -> Django admin (the whole dashboard)
`/media/`   -> uploaded originals, dev only
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from django.views.generic import RedirectView

admin.site.site_header = "Bare Brilliant — Inventory"
admin.site.site_title = "Bare Brilliant Inventory"
admin.site.index_title = "Inventory"

urlpatterns = [
    path("", RedirectView.as_view(url="admin/inventory/product/", permanent=False)),
    path("admin/", admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
