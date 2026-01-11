from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from .models import Subscription


@receiver(post_save, sender=User)
def create_trial_subscription(sender, instance, created, **kwargs):
    """
    Automatically create a trial subscription when a new user is created
    """
    if created:
        # Create a 14-day trial subscription
        trial_start = timezone.now()
        trial_end = trial_start + timedelta(days=14)

        Subscription.objects.create(
            user=instance,
            plan=None,  # No plan during trial
            status='trial',
            trial_start_date=trial_start,
            trial_end_date=trial_end
        )
