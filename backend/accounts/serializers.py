from rest_framework import serializers
from .models import User, Shop, PaymentMethod


class ShopSerializer(serializers.ModelSerializer):
    """Shop/Business settings serializer"""
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            'id', 'shop_name', 'logo', 'logo_url', 'phone_number', 'email',
            'full_address', 'gst_number', 'invoice_prefix', 'quotation_prefix',
            'default_currency', 'delivery_duration_days', 'invoice_numbering_format',
            'default_tax_type', 'default_cgst_percent', 'default_sgst_percent',
            'default_igst_percent', 'show_tax_on_invoice', 'invoice_template',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class BusinessSettingsSerializer(serializers.ModelSerializer):
    """Business settings serializer (subset of Shop)"""
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Shop
        fields = [
            'shop_name', 'logo', 'logo_url', 'phone_number', 'email',
            'full_address', 'gst_number', 'invoice_prefix', 'quotation_prefix',
            'default_currency'
        ]
    
    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class OrderSettingsSerializer(serializers.ModelSerializer):
    """Order settings serializer"""
    class Meta:
        model = Shop
        fields = ['delivery_duration_days']


class InvoiceSettingsSerializer(serializers.ModelSerializer):
    """Invoice settings serializer"""
    class Meta:
        model = Shop
        fields = [
            'invoice_numbering_format', 'default_tax_type',
            'default_cgst_percent', 'default_sgst_percent',
            'default_igst_percent', 'show_tax_on_invoice', 'invoice_template'
        ]

    def validate_default_tax_type(self, value):
        """Ensure default_tax_type is never empty"""
        if not value or value == '':
            return 'GST'
        return value


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Payment method serializer"""
    class Meta:
        model = PaymentMethod
        fields = ['id', 'name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """User serializer"""
    shop_id = serializers.UUIDField(source='shop.id', read_only=True, allow_null=True)
    is_2fa_enabled = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'quotation_prefix', 'invoice_prefix', 
                  'bank_name', 'branch_name', 'account_name', 'account_number', 
                  'ifsc_code', 'gpay_phonepe', 'created_at', 'shop_id', 'role', 'is_2fa_enabled']
        read_only_fields = ['id', 'created_at', 'shop_id']


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


class ChangePasswordSerializer(serializers.Serializer):
    """Change password serializer"""
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=6)
    confirm_password = serializers.CharField(required=True, write_only=True, min_length=6)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords do not match")
        return attrs


class TwoFactorToggleSerializer(serializers.Serializer):
    """2FA toggle serializer"""
    enable = serializers.BooleanField(required=True)


class OTPVerifySerializer(serializers.Serializer):
    """OTP verification serializer"""
    otp = serializers.CharField(required=True, min_length=6, max_length=6)

