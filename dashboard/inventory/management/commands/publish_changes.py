"""CLI twin of the "Publish inventory changes" button.

    python manage.py publish_changes
"""

from django.core.management.base import BaseCommand

from inventory import publisher


class Command(BaseCommand):
    help = "Push products changed since their last publish (+ pending removals); rewrite catalog.json."

    def handle(self, *args, **options):
        run = publisher.run_job("publish", log=lambda m="": self.stdout.write(str(m)))
        self.stdout.write(self.style.SUCCESS(f"publish {run.status}: {run.summary}"))
