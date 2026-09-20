"""The two changelist buttons are always clickable; a stuck or lost run can never lock them."""

import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import PublishRun


def _run(status, minutes_ago, kind="refresh"):
    run = PublishRun.objects.create(kind=kind, status=status)
    PublishRun.objects.filter(pk=run.pk).update(started_at=timezone.now() - timedelta(minutes=minutes_ago))
    return run


class PublishButtonTests(TestCase):
    def setUp(self):
        self.client.force_login(get_user_model().objects.create_superuser("staff", "s@example.com", "pw"))

    def _changelist(self):
        response = self.client.get(reverse("admin:inventory_product_changelist"))
        self.assertEqual(response.status_code, 200)
        return response.content.decode()

    def _form(self, html, action):
        return re.search(rf'<form[^>]*action="[^"]*{action}/"[^>]*>.*?</form>', html, re.S).group(0)

    def assertButtonsActive(self, html):
        for action in ("refresh-inventory", "publish-changes"):
            self.assertNotIn("disabled", self._form(html, action), action)

    def test_buttons_are_active_with_no_runs(self):
        self.assertButtonsActive(self._changelist())

    def test_a_stuck_queued_run_never_disables_the_buttons(self):
        _run("queued", minutes_ago=180)        # queued yesterday evening, worker was never started
        html = self._changelist()
        self.assertButtonsActive(html)
        self.assertNotIn("a run is in progress", html)       # too old to count as in progress
        self.assertIn("is the media worker running", html)   # but tell them why nothing happened

    def test_a_run_in_progress_is_shown_but_still_never_disables_the_buttons(self):
        _run("running", minutes_ago=1)
        html = self._changelist()
        self.assertButtonsActive(html)
        self.assertIn("a run is in progress", html)
        self.assertNotIn("is the media worker running", html)

    def test_freshly_queued_run_is_not_yet_flagged_as_a_missing_worker(self):
        _run("queued", minutes_ago=0)
        html = self._changelist()
        self.assertButtonsActive(html)
        self.assertNotIn("is the media worker running", html)

    def test_no_hint_once_the_last_run_finished(self):
        _run("ok", minutes_ago=5)
        self.assertNotIn("is the media worker running", self._changelist())

    def test_clicking_always_queues_a_run_even_while_one_is_in_progress(self):
        for kind, action in (("refresh", "refresh-inventory"), ("publish", "publish-changes")):
            for state in ("queued", "running"):
                _run(state, minutes_ago=1, kind=kind)
                before = PublishRun.objects.filter(kind=kind).count()
                response = self.client.post(f"/admin/inventory/product/{action}/", follow=True)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(PublishRun.objects.filter(kind=kind).count(), before + 1, (kind, state))
                self.assertTrue(any("queued" in str(m) for m in response.context["messages"]), (kind, state))
                self.assertNotIn("already in progress", response.content.decode())

    def test_is_running_ignores_stale_and_finished_runs(self):
        self.assertFalse(PublishRun.is_running())
        _run("queued", minutes_ago=31)
        _run("running", minutes_ago=45)
        _run("ok", minutes_ago=1)
        _run("error", minutes_ago=1)
        self.assertFalse(PublishRun.is_running())
        _run("queued", minutes_ago=5)
        self.assertTrue(PublishRun.is_running())
