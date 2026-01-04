from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    """Customer serializer"""
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'alternate_phone', 'email', 'address', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_phone(self, value):
        """Validate phone number"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Phone number is required")
        return value.strip()
    
    def validate_name(self, value):
        """Validate name"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Name is required")
        return value.strip()

