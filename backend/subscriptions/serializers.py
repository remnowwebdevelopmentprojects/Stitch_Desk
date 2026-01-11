from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, Payment
from accounts.serializers import UserSerializer


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    user_details = UserSerializer(source='user', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    is_read_only = serializers.SerializerMethodField()
    has_write_access = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = '__all__'

    def get_days_remaining(self, obj):
        return obj.days_until_expiry()

    def get_is_active(self, obj):
        return obj.has_access()

    def get_is_read_only(self, obj):
        """Check if subscription is in read-only mode"""
        return obj.is_read_only()

    def get_has_write_access(self, obj):
        """Check if user can create/edit data"""
        return obj.has_write_access()


class PaymentSerializer(serializers.ModelSerializer):
    subscription_details = SubscriptionSerializer(source='subscription', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
