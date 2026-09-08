"""CLI twin of the "Refresh complete inventory" button.

    python manage.py refresh_inventory
"""

from django.core.management.base import BaseCommand

from inventory import publisher


class Command(BaseCommand):
    help = "Regenerate catalog.json + every published product's JSON and media, then push to storage."

    def handle(self, *args, **options):
        run = publisher.run_job("refresh", log=lambda m="": self.stdout.write(str(m)))
        self.stdout.write(self.style.SUCCESS(f"refresh {run.status}: {run.summary}"))
