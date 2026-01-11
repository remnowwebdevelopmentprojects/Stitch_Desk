"""
Management command to check and expire subscriptions that have passed their end_date.
Run this daily via cron job.

Usage:
    python manage.py check_expired_subscriptions
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from subscriptions.models import Subscription


class Command(BaseCommand):
    help = 'Check for expired subscriptions and update their status'

    def handle(self, *args, **options):
        now = timezone.now()

        # Find active/cancelled subscriptions that have passed their end_date
        expired_subscriptions = Subscription.objects.filter(
            status__in=['active', 'cancelled'],
            end_date__lt=now
        )

        count = expired_subscriptions.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No expired subscriptions found.'))
            return

        # Update status to expired
        for subscription in expired_subscriptions:
            old_status = subscription.status
            subscription.status = 'expired'
            subscription.save()

            self.stdout.write(
                self.style.WARNING(
                    f'Expired subscription for user {subscription.user.email} '
                    f'(was {old_status}, ended {subscription.end_date})'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully expired {count} subscription(s).')
        )
