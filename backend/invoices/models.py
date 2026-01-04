from django.db import models
from django.utils import timezone
import hashlib
import secrets
import uuid
from accounts.models import User


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


class Invoice(models.Model):
    """Invoice model - linked to orders or standalone"""

    GST_TYPE_CHOICES = [
        ('intrastate', 'Intrastate (CGST + SGST)'),
        ('interstate', 'Interstate (IGST)'),
    ]

    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField(default=timezone.now)

    # Optional link to order
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )

    # Customer information
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    customer_address = models.TextField(help_text="Billing address")

    # Tax configuration
    gst_type = models.CharField(
        max_length=20,
        choices=GST_TYPE_CHOICES,
        blank=True,
        null=True
    )
    cgst_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    sgst_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    igst_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    # Calculated totals
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Additional info
    notes = models.TextField(blank=True, null=True)
    terms_and_conditions = models.TextField(
        blank=True,
        null=True,
        default="1. Payment is due within 7 days.\n2. Alterations charged separately.\n3. Please collect items within 30 days."
    )

    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'invoice_number']),
            models.Index(fields=['customer']),
        ]

    def generate_invoice_number(self):
        """Generate unique invoice number based on shop prefix"""
        from django.db.models import Max

        shop = self.user.shop
        prefix = shop.invoice_prefix if shop else 'INV/'

        # Get last invoice number with this prefix for this user
        last_invoice = Invoice.objects.filter(
            user=self.user,
            invoice_number__startswith=prefix
        ).aggregate(Max('invoice_number'))

        if last_invoice['invoice_number__max']:
            try:
                last_num = int(last_invoice['invoice_number__max'].split('/')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1

        return f"{prefix}{new_num:04d}"

    def calculate_totals(self):
        """Calculate subtotal, tax, and total from items"""
        from decimal import Decimal

        items = self.items.all()
        self.subtotal = sum(item.amount for item in items) if items else Decimal('0')

        # Calculate tax based on GST type
        if self.gst_type == 'intrastate':
            cgst = self.subtotal * (self.cgst_percent or Decimal('0')) / Decimal('100')
            sgst = self.subtotal * (self.sgst_percent or Decimal('0')) / Decimal('100')
            self.tax_amount = cgst + sgst
        elif self.gst_type == 'interstate':
            self.tax_amount = self.subtotal * (self.igst_percent or Decimal('0')) / Decimal('100')
        else:
            self.tax_amount = Decimal('0')

        self.total_amount = self.subtotal + self.tax_amount
        return self

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()

        # If linked to order, auto-populate customer if not set
        if self.order and not self.customer_id:
            self.customer = self.order.customer
            if not self.customer_address:
                self.customer_address = self.order.customer.address or ''

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.name}"


class InvoiceItem(models.Model):
    """Invoice item model"""

    UNIT_CHOICES = [
        ('PCS', 'Pieces'),
        ('SET', 'Set'),
        ('PAIR', 'Pair'),
        ('MTR', 'Meters'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')

    # Item details
    item_description = models.CharField(max_length=500, help_text="e.g., Blouse Stitching")
    quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='PCS')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Optional reference to order item
    order_item = models.ForeignKey(
        'orders.OrderItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items'
    )

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        # Auto-calculate amount if not set
        if not self.amount:
            self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.item_description}"
