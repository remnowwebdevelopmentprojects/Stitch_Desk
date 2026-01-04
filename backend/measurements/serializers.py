from rest_framework import serializers
from .models import Measurement, MeasurementTemplate


class MeasurementTemplateFieldSerializer(serializers.Serializer):
    """Serializer for measurement template field definition"""
    label = serializers.CharField(required=True)
    point = serializers.CharField(required=True, help_text="Measurement point identifier (1, 2, 3, etc.)")
    unit = serializers.ChoiceField(choices=['CM', 'INCH'], required=True)


class MeasurementTemplateSerializer(serializers.ModelSerializer):
    """Measurement Template serializer"""
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MeasurementTemplate
        fields = ['id', 'item_type', 'name', 'image', 'image_url', 'fields', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_image_url(self, obj):
        """Get full image URL"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def validate_fields(self, value):
        """Validate fields structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Fields must be a list")
        for field in value:
            if not isinstance(field, dict):
                raise serializers.ValidationError("Each field must be an object")
            if 'label' not in field or 'point' not in field or 'unit' not in field:
                raise serializers.ValidationError("Each field must have label, point, and unit")
        return value


class MeasurementSerializer(serializers.ModelSerializer):
    """Measurement serializer"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    class Meta:
        model = Measurement
        fields = ['id', 'customer', 'customer_name', 'template', 'template_name', 'measurements', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_measurements(self, value):
        """Validate measurements data"""
        if not value or not isinstance(value, dict):
            raise serializers.ValidationError("Measurements must be a valid object")
        return value

