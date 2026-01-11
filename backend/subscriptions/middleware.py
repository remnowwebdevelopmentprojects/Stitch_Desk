from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from subscriptions.models import Subscription


class SubscriptionAccessMiddleware(MiddlewareMixin):
    """
    Middleware to check subscription access and usage limits
    """

    # Paths that don't require subscription check
    EXEMPT_PATHS = [
        '/api/auth/',
        '/api/subscriptions/plans/',
        '/api/subscriptions/my-subscription/',
        '/api/subscriptions/subscribe/',
        '/api/subscriptions/verify-payment/',
        '/admin/',
        '/swagger/',
        '/redoc/',
        '/gallery/',  # Public gallery
    ]

    def process_request(self, request):
        # Skip for exempt paths
        path = request.path
        if any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS):
            return None

        # Skip for non-authenticated users (will be handled by auth middleware)
        if not request.user.is_authenticated:
            return None

        # Skip for superusers
        if request.user.is_superuser:
            return None

        # Check if user has an active subscription
        try:
            subscription = request.user.subscription

            # Check if subscription has access
            if not subscription.has_access():
                return JsonResponse({
                    'error': 'Subscription expired',
                    'message': 'Your trial or subscription has expired. Please upgrade to continue using StitchDesk.',
                    'days_remaining': subscription.days_until_expiry()
                }, status=403)

            # Attach subscription to request for easy access in views
            request.subscription = subscription

        except Subscription.DoesNotExist:
            # This shouldn't happen due to signal, but handle gracefully
            return JsonResponse({
                'error': 'No subscription found',
                'message': 'Please contact support to activate your subscription.'
            }, status=403)

        return None


def check_usage_limit(subscription, resource_type, current_count):
    """
    Helper function to check if user has exceeded their plan limits

    Args:
        subscription: User's subscription object
        resource_type: Type of resource ('customers', 'orders', 'gallery', 'inventory', 'staff')
        current_count: Current number of resources

    Returns:
        dict with 'allowed' (bool) and 'limit' (int or None)
    """
    if not subscription or not subscription.plan:
        # During trial, use basic plan limits
        limit_map = {
            'customers': 100,
            'orders': 50,
            'gallery': 50,
            'inventory': 100,
            'staff': 1
        }
        limit = limit_map.get(resource_type)
    else:
        # Get limit from plan
        plan = subscription.plan
        limit_map = {
            'customers': plan.max_customers,
            'orders': plan.max_orders_per_month,
            'gallery': plan.max_gallery_images,
            'inventory': plan.max_inventory_items,
            'staff': plan.max_staff_users
        }
        limit = limit_map.get(resource_type)

    # None means unlimited
    if limit is None:
        return {'allowed': True, 'limit': None}

    # Check if current count exceeds limit
    return {
        'allowed': current_count < limit,
        'limit': limit,
        'current': current_count
    }
