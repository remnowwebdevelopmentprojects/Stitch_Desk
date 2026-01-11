# Subscription Expiration Handling Guide

## What Happens When a Subscription Ends?

### With Autopay (Normal Flow) ✅

```
Day -7: Razorpay charges customer automatically
         ↓
    Payment Success
         ↓
    Webhook: subscription.charged
         ↓
    Backend extends end_date by 30/365 days
         ↓
    Subscription continues seamlessly
```

### If Payment Fails ❌

```
Day -7: Razorpay attempts charge
         ↓
    Payment Fails
         ↓
    Razorpay retries (up to 4 attempts)
         ↓
    All retries fail
         ↓
    Webhook: subscription.payment_failed
         ↓
    Status: payment_failed
         ↓
    User loses access
```

### If User Cancels 🛑

```
User clicks "Cancel Subscription"
         ↓
    Razorpay cancels subscription
         ↓
    Webhook: subscription.cancelled
         ↓
    Status: cancelled
         ↓
    User keeps access until end_date
         ↓
    After end_date passes
         ↓
    Cron job marks as expired
         ↓
    User loses access
```

---

## Automated Expiration Check

We've created a Django management command that runs daily to check for expired subscriptions.

### Manual Testing

```bash
cd backend
python manage.py check_expired_subscriptions
```

**Output:**
```
No expired subscriptions found.
# OR
Expired subscription for user john@example.com (was cancelled, ended 2024-01-01 00:00:00+00:00)
Successfully expired 1 subscription(s).
```

---

## Setup Automated Daily Check

### Option 1: Using Cron (Linux/macOS Production)

1. **Edit crontab:**
```bash
crontab -e
```

2. **Add this line** (runs daily at 2 AM):
```bash
0 2 * * * cd /path/to/StitchDesk/backend && /path/to/venv/bin/python manage.py check_expired_subscriptions >> /var/log/subscription_check.log 2>&1
```

**Example:**
```bash
0 2 * * * cd /Users/apple/PycharmProjects/StitchDesk/backend && /Users/apple/PycharmProjects/StitchDesk/.venv/bin/python manage.py check_expired_subscriptions >> /tmp/subscription_check.log 2>&1
```

3. **Verify cron is set:**
```bash
crontab -l
```

### Option 2: Using Django Q or Celery (Recommended for Production)

If you want more robust job scheduling:

**Install django-q:**
```bash
pip install django-q
```

**Add to settings.py:**
```python
INSTALLED_APPS = [
    # ...
    'django_q',
]

Q_CLUSTER = {
    'name': 'StitchDesk',
    'workers': 4,
    'timeout': 60,
    'retry': 120,
    'queue_limit': 50,
    'bulk': 10,
    'orm': 'default',
    'schedule': [
        {
            'func': 'subscriptions.tasks.check_expired_subscriptions',
            'schedule_type': 'D',  # Daily
            'repeats': -1,  # Repeat forever
            'next_run': '02:00',  # Run at 2 AM
        }
    ]
}
```

**Create tasks.py:**
```python
# backend/subscriptions/tasks.py
from django.core.management import call_command

def check_expired_subscriptions():
    call_command('check_expired_subscriptions')
```

**Run django-q cluster:**
```bash
python manage.py qcluster
```

### Option 3: Heroku Scheduler (For Heroku Deployments)

1. Add Heroku Scheduler addon:
```bash
heroku addons:create scheduler:standard
```

2. Open scheduler:
```bash
heroku addons:open scheduler
```

3. Add job:
```
Command: python manage.py check_expired_subscriptions
Frequency: Daily at 2:00 AM
```

### Option 4: AWS CloudWatch Events (For AWS Deployments)

Create a Lambda function that runs daily and triggers the management command.

---

## Access Control Logic

### How Backend Checks Access

The `Subscription` model has helper methods:

```python
class Subscription(models.Model):
    # ...

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
```

### Using Access Control in Views

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def some_premium_feature(request):
    if not request.user.subscription.has_access():
        return Response({
            'error': 'Your subscription has expired. Please renew to continue.'
        }, status=403)

    # Feature logic here
    return Response({'data': 'Premium content'})
```

---

## Subscription Status Flow

```
NEW USER
    ↓
[trial] - 14 days free
    ↓
User upgrades → [active]
    ↓
─────────────────────────────────────
│                                   │
│  Auto-renewal every cycle         │
│  (Razorpay charges automatically) │
│                                   │
─────────────────────────────────────
    ↓                    ↓
Payment Success    Payment Fails
    ↓                    ↓
end_date           [payment_failed]
extended                ↓
    ↓              User loses access
Stay [active]
```

**If cancelled:**
```
[active]
    ↓
User cancels
    ↓
[cancelled] - keeps access until end_date
    ↓
Cron job runs
    ↓
[expired] - loses access
```

---

## Timeline Examples

### Example 1: Successful Monthly Subscription

```
Jan 1:  User subscribes (end_date: Feb 1)
Jan 25: Razorpay charges for next month
Jan 25: Webhook received, end_date → Mar 1
Feb 25: Razorpay charges for next month
Feb 25: Webhook received, end_date → Apr 1
... continues automatically
```

### Example 2: Cancelled Subscription

```
Jan 1:  User subscribes (end_date: Feb 1)
Jan 15: User cancels (status → cancelled)
        Razorpay subscription cancelled
        User still has access
Feb 1:  end_date reached
Feb 2:  Cron runs at 2 AM
        Status → expired
        User loses access
```

### Example 3: Payment Failed

```
Jan 1:  User subscribes (end_date: Feb 1)
Jan 25: Razorpay attempts charge → FAILS
Jan 26: Retry 1 → FAILS
Jan 27: Retry 2 → FAILS
Jan 28: Retry 3 → FAILS
Jan 29: All retries exhausted
        Webhook: payment_failed
        Status → payment_failed
        User loses access immediately
```

---

## Monitoring & Alerts

### Check Subscription Health

```bash
# Count by status
python manage.py shell
```

```python
from subscriptions.models import Subscription

print(f"Trial: {Subscription.objects.filter(status='trial').count()}")
print(f"Active: {Subscription.objects.filter(status='active').count()}")
print(f"Cancelled: {Subscription.objects.filter(status='cancelled').count()}")
print(f"Expired: {Subscription.objects.filter(status='expired').count()}")
print(f"Payment Failed: {Subscription.objects.filter(status='payment_failed').count()}")
```

### Set Up Email Alerts

Add to your cron job or scheduled task:

```python
# subscriptions/tasks.py
from django.core.mail import send_mail
from django.conf import settings

def send_expiration_report():
    from subscriptions.models import Subscription
    from django.utils import timezone

    # Find subscriptions expiring in next 7 days
    expiring_soon = Subscription.objects.filter(
        status='active',
        end_date__lt=timezone.now() + timedelta(days=7),
        end_date__gt=timezone.now()
    )

    if expiring_soon.exists():
        message = f"{expiring_soon.count()} subscriptions expiring in next 7 days"
        send_mail(
            'Subscription Alert',
            message,
            settings.EMAIL_HOST_USER,
            ['admin@stitchdesk.com'],
            fail_silently=False,
        )
```

---

## Testing Expiration Logic

### 1. Create Test Subscription with Past end_date

```python
python manage.py shell
```

```python
from subscriptions.models import Subscription
from accounts.models import User
from django.utils import timezone
from datetime import timedelta

# Get a test user
user = User.objects.get(email='test@example.com')

# Set end_date to yesterday
sub = user.subscription
sub.status = 'active'
sub.end_date = timezone.now() - timedelta(days=1)
sub.save()

print(f"Subscription end_date: {sub.end_date}")
print(f"Current time: {timezone.now()}")
print(f"Has access: {sub.has_access()}")
```

### 2. Run Management Command

```bash
python manage.py check_expired_subscriptions
```

**Expected output:**
```
Expired subscription for user test@example.com (was active, ended 2024-01-10 00:00:00+00:00)
Successfully expired 1 subscription(s).
```

### 3. Verify Status Changed

```python
python manage.py shell
```

```python
from subscriptions.models import Subscription
from accounts.models import User

user = User.objects.get(email='test@example.com')
sub = user.subscription

print(f"Status: {sub.status}")  # Should be 'expired'
print(f"Has access: {sub.has_access()}")  # Should be False
```

---

## Production Checklist

- [ ] Management command created and tested
- [ ] Cron job or scheduler configured
- [ ] Logs directory created and writable
- [ ] Email alerts configured (optional)
- [ ] Monitoring dashboard shows subscription health
- [ ] Test with past end_dates to verify expiration
- [ ] Webhook delivery monitoring in Razorpay Dashboard
- [ ] Fallback plan if webhooks fail

---

## Summary

**What happens when a plan ends:**

1. **Normal case:** Razorpay auto-charges → Subscription extends → User keeps access ✅
2. **Payment fails:** Status → `payment_failed` → User loses access immediately ❌
3. **User cancels:** Status → `cancelled` → Access until `end_date` → Cron marks as `expired` 🛑
4. **Billing complete:** Status → `expired` → User loses access ❌

**Key mechanism:**
- **Webhooks** handle real-time events
- **Cron job** catches edge cases and ensures expired subscriptions are marked correctly
- **has_access()** method checks both status AND end_date for access control
