from django.db import models
from django.utils import timezone
import uuid
from accounts.models import User
from customers.models import Customer
from measurements.models import MeasurementTemplate


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
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Price per unit")
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
