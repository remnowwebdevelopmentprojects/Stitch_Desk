from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid


class Shop(models.Model):
    """Shop/Business settings model - shared by all users of the shop"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop_name = models.CharField(max_length=200, default='My Shop')
    logo = models.ImageField(upload_to='shop_logos/', blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    full_address = models.TextField(blank=True, null=True)
    gst_number = models.CharField(max_length=20, blank=True, null=True)
    invoice_prefix = models.CharField(max_length=50, default='INV/25-26/')
    quotation_prefix = models.CharField(max_length=50, default='QUO/25-26/')
    default_currency = models.CharField(max_length=10, default='INR')
    
    # Order settings
    delivery_duration_days = models.PositiveIntegerField(default=7)
    
    # Invoice settings
    invoice_numbering_format = models.CharField(max_length=100, default='{prefix}{number}')
    default_tax_type = models.CharField(max_length=20, default='GST', choices=[
        ('GST', 'GST'),
        ('NON_GST', 'Non-GST'),
    ])
    default_cgst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=9.00)
    default_sgst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=9.00)
    default_igst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    show_tax_on_invoice = models.BooleanField(default=True)

    # Invoice template selection
    TEMPLATE_CHOICES = [
        ('classic', 'Classic'),
        ('modern', 'Modern'),
        ('minimal', 'Minimal'),
        ('elegant', 'Elegant'),
    ]
    invoice_template = models.CharField(
        max_length=20,
        choices=TEMPLATE_CHOICES,
        default='classic',
        help_text="Invoice PDF template style"
    )

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.shop_name
    
    class Meta:
        db_table = 'shops'


class PaymentMethod(models.Model):
    """Dynamic payment methods for a shop"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='payment_methods')
    name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'payment_methods'
        unique_together = ['shop', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.shop.shop_name}"


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
    
    # Link to shop (for multi-staff support)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    role = models.CharField(max_length=20, default='owner', choices=[
        ('owner', 'Owner'),
        ('staff', 'Staff'),
    ])
    
    # Payment info fields
    bank_name = models.CharField(max_length=200, blank=True, null=True)
    branch_name = models.CharField(max_length=200, blank=True, null=True)
    account_name = models.CharField(max_length=200, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    ifsc_code = models.CharField(max_length=20, blank=True, null=True)
    gpay_phonepe = models.CharField(max_length=50, blank=True, null=True)
    
    # 2FA fields
    is_2fa_enabled = models.BooleanField(default=False)
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_expires_at = models.DateTimeField(blank=True, null=True)
    
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
