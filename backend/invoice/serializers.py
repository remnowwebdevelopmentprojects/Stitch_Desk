from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Quotation, Item, Customer, Measurement, Order, OrderItem, MeasurementTemplate


class UserSerializer(serializers.ModelSerializer):
    """User serializer"""
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'quotation_prefix', 'invoice_prefix', 
                  'bank_name', 'branch_name', 'account_name', 'account_number', 
                  'ifsc_code', 'gpay_phonepe', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    """Registration serializer"""
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)
    username = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'name', 'password', 'password_confirm']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        # Auto-generate username from email if not provided
        if not attrs.get('username'):
            attrs['username'] = attrs['email']
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """Login serializer"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            try:
                user = User.objects.get(email=email)
                if user.check_password(password):
                    attrs['user'] = user
                    return attrs
                else:
                    raise serializers.ValidationError('Invalid email or password')
            except User.DoesNotExist:
                raise serializers.ValidationError('Invalid email or password')
        else:
            raise serializers.ValidationError('Must include email and password')


class ItemSerializer(serializers.ModelSerializer):
    """Item serializer"""
    class Meta:
        model = Item
        fields = ['id', 'description', 'hsn_code', 'default_rate', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuotationSerializer(serializers.ModelSerializer):
    """Quotation/Invoice serializer"""
    class Meta:
        model = Quotation
        fields = ['id', 'quotation_no', 'date', 'to_address', 'client_phone',
                  'currency', 'document_type', 'payment_status', 'bank_name',
                  'branch_name', 'account_name', 'account_number', 'ifsc_code',
                  'gpay_phonepe', 'gst_type', 'cgst_rate', 'sgst_rate', 'igst_rate',
                  'items', 'sub_total', 'gst_amount', 'total_amount', 'share_token',
                  'voided', 'created_at']
        read_only_fields = ['id', 'share_token', 'created_at']
    
    def validate_account_number(self, value):
        """Clean account number - remove 'w' prefix if present"""
        if value:
            clean_account = str(value).strip()
            if clean_account.lower().startswith('w'):
                clean_account = clean_account[1:]
            return clean_account.strip()
        return value
    
    def validate(self, attrs):
        # Calculate sub_total
        sub_total = 0
        items = attrs.get('items', [])
        for item in items:
            if 'amount' in item and item['amount']:
                try:
                    sub_total += float(item['amount'])
                except (ValueError, TypeError):
                    pass
        
        # Calculate GST amount and total
        gst_amount = 0
        gst_type = attrs.get('gst_type')
        currency = attrs.get('currency', 'INR')
        
        if currency == 'INR' and gst_type:
            if gst_type == 'intrastate':
                cgst_rate = float(attrs.get('cgst_rate', 0) or 0)
                sgst_rate = float(attrs.get('sgst_rate', 0) or 0)
                gst_amount = (sub_total * cgst_rate / 100) + (sub_total * sgst_rate / 100)
            elif gst_type == 'interstate':
                igst_rate = float(attrs.get('igst_rate', 0) or 0)
                gst_amount = sub_total * igst_rate / 100
        
        total = sub_total + gst_amount
        
        attrs['sub_total'] = sub_total
        attrs['gst_amount'] = gst_amount
        attrs['total_amount'] = total
        
        return attrs


class PaymentInfoSerializer(serializers.Serializer):
    """Payment info serializer"""
    bank_name = serializers.CharField(required=False, allow_blank=True)
    branch_name = serializers.CharField(required=False, allow_blank=True)
    account_name = serializers.CharField(required=False, allow_blank=True)
    account_number = serializers.CharField(required=False, allow_blank=True)
    ifsc_code = serializers.CharField(required=False, allow_blank=True)
    gpay_phonepe = serializers.CharField(required=False, allow_blank=True)


class PrefixSerializer(serializers.Serializer):
    """Prefix serializer"""
    quotation_prefix = serializers.CharField(required=True)
    invoice_prefix = serializers.CharField(required=True)


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


class OrderItemSerializer(serializers.ModelSerializer):
    """Order Item serializer for reading"""
    template_details = MeasurementTemplateSerializer(source='template', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'order', 'template', 'template_details', 'item_type', 
                  'quantity', 'measurements', 'sample_given', 'design_reference', 'notes', 
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
        fields = ['template', 'item_type', 'quantity', 'measurements', 
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
    
    def validate_extra_charge(self, value):
        """Ensure extra_charge is 0 if not provided or None"""
        if value is None:
            return 0
        if value < 0:
            raise serializers.ValidationError("Extra charge cannot be negative")
        return value
    
    def validate_discount(self, value):
        """Ensure discount is 0 if not provided or None"""
        if value is None:
            return 0
        if value < 0:
            raise serializers.ValidationError("Discount cannot be negative")
        return value
    
    def validate_tax(self, value):
        """Ensure tax is 0 if not provided or None"""
        if value is None:
            return 0
        if value < 0:
            raise serializers.ValidationError("Tax cannot be negative")
        return value
    
    def validate_amount_paid(self, value):
        """Ensure amount_paid is 0 if not provided or None"""
        if value is None:
            return 0
        if value < 0:
            raise serializers.ValidationError("Amount paid cannot be negative")
        return value
    
    def validate_stitching_charge(self, value):
        """Validate stitching charge"""
        if value is None or value <= 0:
            raise serializers.ValidationError("Stitching charge must be greater than 0")
        return value
    
    def create(self, validated_data):
        """Create order with items"""
        items_data = validated_data.pop('items')
        # user and created_by are set by perform_create in the ViewSet
        
        # Ensure numeric fields are explicitly set to 0 if None
        validated_data.setdefault('extra_charge', 0)
        validated_data.setdefault('discount', 0)
        validated_data.setdefault('tax', 0)
        validated_data.setdefault('amount_paid', 0)
        
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

