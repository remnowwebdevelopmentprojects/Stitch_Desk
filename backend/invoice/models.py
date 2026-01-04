from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import hashlib
import secrets
import uuid


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user with email"""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        # Auto-generate username from email if not provided
        if 'username' not in extra_fields or not extra_fields.get('username'):
            extra_fields['username'] = email
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with email"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom User model extending Django's AbstractUser"""
    name = models.CharField(max_length=100)
    quotation_prefix = models.CharField(max_length=50, default='QUO/25-26/')
    invoice_prefix = models.CharField(max_length=50, default='INV/25-26/')
    created_at = models.DateTimeField(default=timezone.now)
    
    # Payment info fields
    bank_name = models.CharField(max_length=200, blank=True, null=True)
    branch_name = models.CharField(max_length=200, blank=True, null=True)
    account_name = models.CharField(max_length=200, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    ifsc_code = models.CharField(max_length=20, blank=True, null=True)
    gpay_phonepe = models.CharField(max_length=50, blank=True, null=True)
    
    # Override email to make it unique and required
    email = models.EmailField(unique=True)
    
    # Make username nullable since we use email for login
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    
    def save(self, *args, **kwargs):
        # Auto-generate username from email if not provided
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.email


class Quotation(models.Model):
    """Quotation/Invoice model"""
    DOCUMENT_TYPE_CHOICES = [
        ('quotation', 'Quotation'),
        ('invoice', 'Invoice'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('unpaid', 'Unpaid'),
    ]
    
    GST_TYPE_CHOICES = [
        ('interstate', 'Interstate'),
        ('intrastate', 'Intrastate'),
    ]
    
    CURRENCY_CHOICES = [
        ('INR', 'INR'),
        ('USD', 'USD'),
        ('EUR', 'EUR'),
        ('GBP', 'GBP'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quotations')
    quotation_no = models.CharField(max_length=100, unique=True)
    date = models.DateField()
    to_address = models.TextField()
    client_phone = models.CharField(max_length=50, blank=True, null=True)
    currency = models.CharField(max_length=10, choices=CURRENCY_CHOICES, default='INR')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES, default='invoice')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    
    # Payment info fields
    bank_name = models.CharField(max_length=200, blank=True, null=True)
    branch_name = models.CharField(max_length=200, blank=True, null=True)
    account_name = models.CharField(max_length=200, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    ifsc_code = models.CharField(max_length=20, blank=True, null=True)
    gpay_phonepe = models.CharField(max_length=50, blank=True, null=True)
    
    # GST fields
    gst_type = models.CharField(max_length=20, choices=GST_TYPE_CHOICES, blank=True, null=True)
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    igst_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    
    items = models.JSONField()
    
    sub_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    share_token = models.CharField(max_length=100, unique=True, blank=True, null=True)
    voided = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
    
    def generate_share_token(self):
        """Generate a unique share token for secure URL access"""
        if not self.share_token:
            unique_string = f"{self.id}-{self.quotation_no}-{secrets.token_hex(16)}"
            self.share_token = hashlib.sha256(unique_string.encode()).hexdigest()[:32]
            self.save(update_fields=['share_token'])
        return self.share_token
    
    def __str__(self):
        return f"{self.quotation_no} - {self.document_type}"


class Item(models.Model):
    """Item model for storing reusable items"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=500)
    hsn_code = models.CharField(max_length=50, blank=True, null=True)
    default_rate = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.description


class Customer(models.Model):
    """Customer model for managing customer information"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50)
    alternate_phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.phone}"


class MeasurementTemplate(models.Model):
    """Measurement Template model - configurable measurement templates per item type"""
    ITEM_TYPE_CHOICES = [
        ('BLOUSE', 'Blouse'),
        ('SAREE', 'Saree'),
        ('DRESS', 'Dress'),
        ('OTHER', 'Other'),
    ]
    
    UNIT_CHOICES = [
        ('CM', 'Centimeters'),
        ('INCH', 'Inches'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='measurement_templates')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    name = models.CharField(max_length=200, help_text="Template name (e.g., 'Standard Blouse Template')")
    image = models.ImageField(upload_to='measurement_templates/', help_text="Sketch image with measurement points")
    
    # Store field definitions as JSON: [{"label": "Chest", "point": "1", "unit": "CM"}, ...]
    fields = models.JSONField(default=list, help_text="Measurement field definitions")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['item_type', '-created_at']
        indexes = [
            models.Index(fields=['user', 'item_type', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.item_type} - {self.name}"


class Measurement(models.Model):
    """Measurement model - actual measurements taken for customers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='measurements')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='measurements')
    template = models.ForeignKey(MeasurementTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='measurements')
    
    # Store measurements as JSON: {"1": 36, "2": 32, ...} where keys are field points
    measurements = models.JSONField(default=dict, help_text="Measurement data as key-value pairs")
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'customer', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.customer.name} - {self.created_at.strftime('%Y-%m-%d')}"


class Order(models.Model):
    """Order model for boutique orders"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_STITCHING', 'In Stitching'),
        ('READY', 'Ready'),
        ('DELIVERED', 'Delivered'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PARTIAL', 'Partial'),
        ('PAID', 'Paid'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI'),
        ('BANK', 'Bank Transfer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders')
    
    order_number = models.CharField(max_length=100)
    order_date = models.DateField(default=timezone.now)
    delivery_date = models.DateField()
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Pricing fields
    stitching_charge = models.DecimalField(max_digits=10, decimal_places=2)
    extra_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Payment fields
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='UNPAID')
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='orders_created')
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'order_number']),
        ]
        unique_together = [['user', 'order_number']]
    
    def calculate_totals(self):
        """Calculate subtotal and total amount"""
        self.subtotal = self.stitching_charge + self.extra_charge - self.discount
        self.total_amount = self.subtotal + self.tax
        self.balance_amount = self.total_amount - self.amount_paid
        return self
    
    def save(self, *args, **kwargs):
        # Auto-generate order number if not provided
        if not self.order_number:
            self.order_number = self.generate_order_number()
        
        # Calculate totals before saving
        self.calculate_totals()
        
        super().save(*args, **kwargs)
    
    def generate_order_number(self):
        """Generate unique order number per boutique"""
        from django.db.models import Max
        prefix = f"ORD/{timezone.now().strftime('%y-%m')}/"
        last_order = Order.objects.filter(
            user=self.user,
            order_number__startswith=prefix
        ).aggregate(Max('order_number'))
        
        if last_order['order_number__max']:
            last_num = int(last_order['order_number__max'].split('/')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        return f"{prefix}{new_num:04d}"
    
    def __str__(self):
        return f"{self.order_number} - {self.customer.name}"


class OrderItem(models.Model):
    """Order Item model - items in an order"""
    ITEM_TYPE_CHOICES = [
        ('BLOUSE', 'Blouse'),
        ('SAREE', 'Saree'),
        ('DRESS', 'Dress'),
        ('OTHER', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    template = models.ForeignKey(MeasurementTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    quantity = models.IntegerField(default=1)
    # Store measurements directly: {"1": 36, "2": 32, ...}
    measurements = models.JSONField(default=dict, help_text="Measurement values as key-value pairs")
    sample_given = models.BooleanField(default=False)
    design_reference = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['order', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.order.order_number} - {self.item_type} x{self.quantity}"
