"""
Custom permission classes for subscription-based access control
"""
from rest_framework import permissions


class HasActiveSubscription(permissions.BasePermission):
    """
    Permission that requires an active subscription for any access
    """
    message = "Your subscription has expired. Please renew to continue using StitchDesk."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        try:
            return request.user.subscription.has_access()
        except AttributeError:
            return False


class HasReadAccess(permissions.BasePermission):
    """
    Permission that allows read access even for expired subscriptions (30-day grace period)
    """
    message = "Your grace period has ended. Please renew your subscription to access your data."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        try:
            return request.user.subscription.has_read_access()
        except AttributeError:
            return False


class HasWriteAccess(permissions.BasePermission):
    """
    Permission for create/update/delete operations
    Requires active subscription - expired users cannot write
    """
    message = "Your subscription has expired. You can view your data but cannot make changes. Please renew to continue editing."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # For safe methods (GET, HEAD, OPTIONS), allow if has read access
        if request.method in permissions.SAFE_METHODS:
            try:
                return request.user.subscription.has_read_access()
            except AttributeError:
                return False

        # For unsafe methods (POST, PUT, PATCH, DELETE), require write access
        try:
            return request.user.subscription.has_write_access()
        except AttributeError:
            return False


class ReadOnlyIfExpired(permissions.BasePermission):
    """
    Composite permission:
    - Active users: Full access
    - Expired users (within grace period): Read-only access
    - Beyond grace period: No access
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        try:
            subscription = request.user.subscription

            # Check if user has any access at all (including grace period)
            if not subscription.has_read_access():
                self.message = "Your grace period has ended. Please renew your subscription."
                return False

            # For read operations, allow if has read access
            if request.method in permissions.SAFE_METHODS:
                return subscription.has_read_access()

            # For write operations, require active subscription
            if not subscription.has_write_access():
                self.message = "Your subscription has expired. You can view your data but cannot make changes. Please renew to continue editing."
                return False

            return True

        except AttributeError:
            self.message = "No subscription found."
            return False

    def has_object_permission(self, request, view, obj):
        """Also check at object level"""
        return self.has_permission(request, view)
