from rest_framework import serializers
from .models import Order, OrderItem
from measurements.serializers import MeasurementTemplateSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    """Order Item serializer for reading"""
    template_details = MeasurementTemplateSerializer(source='template', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'order', 'template', 'template_details', 'item_type',
                  'quantity', 'unit_price', 'measurements', 'sample_given', 'design_reference', 'notes',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'order', 'created_at', 'updated_at']
    
    def validate_quantity(self, value):
        """Validate quantity"""
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        return value
    
    def validate_measurements(self, value):
        """Validate measurements data"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Measurements must be a valid object")
        return value


class OrderItemCreateSerializer(serializers.ModelSerializer):
    """Order Item serializer for creation (without order field)"""
    
    class Meta:
        model = OrderItem
        fields = ['template', 'item_type', 'quantity', 'unit_price', 'measurements',
                  'sample_given', 'design_reference', 'notes']
    
    def validate_quantity(self, value):
        """Validate quantity"""
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        return value
    
    def validate_measurements(self, value):
        """Validate measurements data"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Measurements must be a valid object")
        return value


class OrderSerializer(serializers.ModelSerializer):
    """Order serializer"""
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'customer', 'customer_name', 'customer_phone', 'order_number',
                  'order_date', 'delivery_date', 'status', 'stitching_charge', 
                  'extra_charge', 'discount', 'subtotal', 'tax', 'total_amount',
                  'payment_status', 'amount_paid', 'balance_amount', 'payment_method',
                  'notes', 'items', 'created_by', 'created_at', 'updated_at']
        read_only_fields = ['id', 'order_number', 'subtotal', 'total_amount', 
                          'balance_amount', 'created_at', 'updated_at']
    
    def validate_delivery_date(self, value):
        """Validate delivery date"""
        from django.utils.dateparse import parse_date
        
        order_date_str = self.initial_data.get('order_date')
        if order_date_str:
            order_date = parse_date(order_date_str)
            if order_date and value < order_date:
                raise serializers.ValidationError("Delivery date must be after order date")
        return value
    
    def validate(self, attrs):
        """Validate order data"""
        # Ensure amounts are positive
        if attrs.get('stitching_charge', 0) < 0:
            raise serializers.ValidationError("Stitching charge cannot be negative")
        if attrs.get('extra_charge', 0) < 0:
            raise serializers.ValidationError("Extra charge cannot be negative")
        if attrs.get('discount', 0) < 0:
            raise serializers.ValidationError("Discount cannot be negative")
        if attrs.get('amount_paid', 0) < 0:
            raise serializers.ValidationError("Amount paid cannot be negative")
        
        return attrs


class OrderCreateSerializer(serializers.ModelSerializer):
    """Order creation serializer with nested items"""
    items = OrderItemCreateSerializer(many=True)
    
    class Meta:
        model = Order
        fields = ['customer', 'order_date', 'delivery_date', 'stitching_charge',
                  'extra_charge', 'discount', 'tax', 'payment_status', 'amount_paid',
                  'payment_method', 'notes', 'items']
    
    def create(self, validated_data):
        """Create order with items"""
        items_data = validated_data.pop('items')
        # user and created_by are set by perform_create in the ViewSet
        
        # Create order (user and created_by will be passed from perform_create)
        order = Order.objects.create(**validated_data)
        
        # Create order items
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        
        return order
    
    def validate_items(self, value):
        """Validate items"""
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one item is required")
        return value
    
    def validate_delivery_date(self, value):
        """Validate delivery date"""
        from django.utils.dateparse import parse_date
        
        order_date_str = self.initial_data.get('order_date')
        if order_date_str:
            order_date = parse_date(order_date_str)
            if order_date and value < order_date:
                raise serializers.ValidationError("Delivery date must be after order date")
        return value


class OrderUpdateSerializer(serializers.ModelSerializer):
    """Order update serializer with nested items"""
    items = OrderItemCreateSerializer(many=True, required=False)
    
    class Meta:
        model = Order
        fields = ['order_date', 'delivery_date', 'status', 'stitching_charge',
                  'extra_charge', 'discount', 'tax', 'payment_status', 'amount_paid',
                  'payment_method', 'notes', 'items']
    
    def update(self, instance, validated_data):
        """Update order with optional items"""
        items_data = validated_data.pop('items', None)
        
        # Update order fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # If items are provided, replace all existing items
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            
            # Create new items
            for item_data in items_data:
                OrderItem.objects.create(order=instance, **item_data)
        
        instance.save()
        return instance
    
    def validate_delivery_date(self, value):
        """Validate delivery date"""
        from django.utils.dateparse import parse_date
        
        order_date_str = self.initial_data.get('order_date')
        if order_date_str:
            order_date = parse_date(order_date_str)
            if order_date and value < order_date:
                raise serializers.ValidationError("Delivery date must be after order date")
        return value


