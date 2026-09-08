"""Auto-login middleware — the "no login" requirement.

Every request is authenticated as a single persistent staff user, so the stock
Django admin is reachable without a login screen. Active only while
``settings.DEBUG`` is true; in a real deployment leave DEBUG off and this
middleware becomes a no-op, restoring normal authentication.
"""

from django.conf import settings
from django.contrib.auth import get_user_model, login

_SESSION_FLAG = "_auto_login_done"


class AutoLoginMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = bool(getattr(settings, "DEBUG", False))

    def __call__(self, request):
        if self.enabled and not request.user.is_authenticated:
            user = self._dashboard_user()
            if user is not None:
                request.user = user
                if not request.session.get(_SESSION_FLAG):
                    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
                    request.session[_SESSION_FLAG] = True
        return self.get_response(request)

    @staticmethod
    def _dashboard_user():
        User = get_user_model()
        username = getattr(settings, "DASHBOARD_USER", "staff")
        try:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"is_staff": True, "is_superuser": True, "is_active": True},
            )
        except Exception:
            # DB not migrated yet (e.g. first `migrate` run) — skip silently.
            return None
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
        return user
