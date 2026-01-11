"""
Run this script to create default subscription plans:
python manage.py shell < subscriptions/init_plans.py
"""
from subscriptions.models import SubscriptionPlan

# Create Basic Monthly Plan
SubscriptionPlan.objects.get_or_create(
    plan_type='basic',
    billing_cycle='monthly',
    defaults={
        'name': 'Basic - Monthly',
        'price': 599.00,
        'max_customers': 100,
        'max_orders_per_month': 50,
        'max_gallery_images': 50,
        'max_inventory_items': 100,
        'max_staff_users': 1,  # Only owner
        'is_active': True,
    }
)

# Create Basic Yearly Plan
SubscriptionPlan.objects.get_or_create(
    plan_type='basic',
    billing_cycle='yearly',
    defaults={
        'name': 'Basic - Yearly',
        'price': 5990.00,
        'max_customers': 100,
        'max_orders_per_month': 50,
        'max_gallery_images': 50,
        'max_inventory_items': 100,
        'max_staff_users': 1,  # Only owner
        'is_active': True,
    }
)

# Create Pro Monthly Plan
SubscriptionPlan.objects.get_or_create(
    plan_type='pro',
    billing_cycle='monthly',
    defaults={
        'name': 'Pro - Monthly',
        'price': 1099.00,
        'max_customers': None,  # Unlimited
        'max_orders_per_month': None,  # Unlimited
        'max_gallery_images': None,  # Unlimited
        'max_inventory_items': None,  # Unlimited
        'max_staff_users': None,  # Unlimited
        'is_active': True,
    }
)

# Create Pro Yearly Plan
SubscriptionPlan.objects.get_or_create(
    plan_type='pro',
    billing_cycle='yearly',
    defaults={
        'name': 'Pro - Yearly',
        'price': 10990.00,
        'max_customers': None,  # Unlimited
        'max_orders_per_month': None,  # Unlimited
        'max_gallery_images': None,  # Unlimited
        'max_inventory_items': None,  # Unlimited
        'max_staff_users': None,  # Unlimited
        'is_active': True,
    }
)

print("Default subscription plans created successfully!")
print("\nPlans created:")
for plan in SubscriptionPlan.objects.all():
    print(f"- {plan.name}: ₹{plan.price}")

