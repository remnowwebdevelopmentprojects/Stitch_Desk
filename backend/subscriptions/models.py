from django.db import models
from django.utils import timezone
from datetime import timedelta
from accounts.models import User


class SubscriptionPlan(models.Model):
    """Subscription plans available for purchase"""
    PLAN_TYPE_CHOICES = [
        ('basic', 'Basic'),
        ('pro', 'Pro'),
        ('custom', 'Custom'),
    ]

    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]

    name = models.CharField(max_length=100)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES)
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLE_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    # Usage limits (null = unlimited)
    max_customers = models.IntegerField(null=True, blank=True, help_text="Null means unlimited")
    max_orders_per_month = models.IntegerField(null=True, blank=True, help_text="Null means unlimited")
    max_gallery_images = models.IntegerField(null=True, blank=True, help_text="Null means unlimited")
    max_inventory_items = models.IntegerField(null=True, blank=True, help_text="Null means unlimited")
    max_staff_users = models.IntegerField(null=True, blank=True, help_text="Null means unlimited")

    # Razorpay integration
    razorpay_plan_id = models.CharField(max_length=100, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price']
        unique_together = ['plan_type', 'billing_cycle']

    def __str__(self):
        return f"{self.name} - {self.get_billing_cycle_display()}"


class Subscription(models.Model):
    """User subscription tracking"""
    STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('payment_failed', 'Payment Failed'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')

    # Trial period
    trial_start_date = models.DateTimeField(null=True, blank=True)
    trial_end_date = models.DateTimeField(null=True, blank=True)

    # Subscription period
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    # Razorpay details
    razorpay_subscription_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_customer_id = models.CharField(max_length=100, blank=True, null=True)

    # Cancellation
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.status}"

    def is_trial_active(self):
        """Check if trial period is still active"""
        if self.status == 'trial' and self.trial_end_date:
            return timezone.now() < self.trial_end_date
        return False

    def is_subscription_active(self):
        """Check if paid subscription is active"""
        if self.status == 'active' and self.end_date:
            return timezone.now() < self.end_date
        return False

    def has_access(self):
        """Check if user has access to the platform"""
        return self.is_trial_active() or self.is_subscription_active()

    def has_write_access(self):
        """
        Check if user can create/edit/delete data
        Returns False if subscription/trial expired - user gets read-only access
        """
        return self.has_access()

    def has_read_access(self):
        """
        Check if user can view/read data
        Even expired users can read their data (for 30 days grace period)
        """
        # Active users can always read
        if self.has_access():
            return True

        # Expired users get 30-day grace period for read-only access
        grace_period_days = 30

        if self.status == 'expired' and self.end_date:
            grace_end = self.end_date + timedelta(days=grace_period_days)
            return timezone.now() < grace_end

        if self.status == 'trial' and self.trial_end_date:
            grace_end = self.trial_end_date + timedelta(days=grace_period_days)
            return timezone.now() < grace_end

        # Cancelled or payment_failed users also get grace period
        if self.status in ['cancelled', 'payment_failed'] and self.end_date:
            grace_end = self.end_date + timedelta(days=grace_period_days)
            return timezone.now() < grace_end

        return False

    def is_read_only(self):
        """Check if user is in read-only mode (can read but not write)"""
        return self.has_read_access() and not self.has_write_access()

    def days_until_expiry(self):
        """Calculate days until subscription expires"""
        if self.is_trial_active():
            return (self.trial_end_date - timezone.now()).days
        elif self.is_subscription_active():
            return (self.end_date - timezone.now()).days
        return 0


class Payment(models.Model):
    """Payment transactions"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='payments')

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Razorpay details
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)

    payment_method = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} - {self.status} - ₹{self.amount}"
