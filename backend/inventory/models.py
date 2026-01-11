import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from accounts.models import User, Shop


class InventoryCategory(models.Model):
    """Categories for organizing inventory items (Fabric, Buttons, Thread, etc.)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inventory_categories')
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='inventory_categories', null=True, blank=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    # Default unit for this category
    UNIT_CHOICES = [
        ('PCS', 'Pieces'),
        ('MTR', 'Meters'),
        ('YRD', 'Yards'),
        ('SET', 'Set'),
        ('ROLL', 'Roll'),
        ('SPOOL', 'Spool'),
        ('KG', 'Kilograms'),
        ('GM', 'Grams'),
    ]
    default_unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='PCS')
    
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_categories'
        ordering = ['name']
        verbose_name_plural = 'Inventory Categories'
        unique_together = [['shop', 'name']]

    def __str__(self):
        return f"{self.name} - {self.shop.shop_name}"


class InventoryItem(models.Model):
    """Individual inventory items that can be used in orders"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='inventory_items')
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='inventory_items', null=True, blank=True)
    category = models.ForeignKey(
        InventoryCategory,
        on_delete=models.SET_NULL,
        related_name='items',
        blank=True,
        null=True
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=50, blank=True, null=True, help_text="Optional SKU/code")
    
    # Unit of measurement
    UNIT_CHOICES = [
        ('PCS', 'Pieces'),
        ('MTR', 'Meters'),
        ('YRD', 'Yards'),
        ('SET', 'Set'),
        ('ROLL', 'Roll'),
        ('SPOOL', 'Spool'),
        ('KG', 'Kilograms'),
        ('GM', 'Grams'),
    ]
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default='PCS')
    
    # Stock management
    current_stock = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )
    minimum_stock = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Alert when stock falls below this level"
    )
    
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_items'
        ordering = ['name']
        indexes = [
            models.Index(fields=['shop', 'is_active', 'is_deleted']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['shop', 'current_stock']),
        ]

    def __str__(self):
        return f"{self.name} ({self.current_stock} {self.unit})"
    
    @property
    def is_low_stock(self):
        """Check if stock is below minimum threshold"""
        return self.current_stock < self.minimum_stock


class OrderMaterial(models.Model):
    """Materials/Items used in an order - links orders to inventory"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='materials_used'
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.PROTECT,
        related_name='order_usages'
    )
    
    quantity = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Price at time of use (copied from inventory item)"
    )
    notes = models.TextField(blank=True, null=True)
    
    # Track who added this
    added_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='materials_added'
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'order_materials'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order.order_number} - {self.inventory_item.name} x {self.quantity}"
    
    @property
    def total_cost(self):
        """Calculate total cost for this material usage"""
        if self.unit_price:
            return self.quantity * self.unit_price
        return None

    def save(self, *args, **kwargs):
        # No longer copying unit price since we removed pricing fields
        super().save(*args, **kwargs)


class StockHistory(models.Model):
    """Track all stock movements - audit trail"""
    TRANSACTION_TYPE_CHOICES = [
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
        ('ADJUSTMENT', 'Adjustment'),
    ]
    
    REASON_CHOICES = [
        ('PURCHASE', 'Purchase/Restock'),
        ('ORDER_USAGE', 'Used in Order'),
        ('DAMAGED', 'Damaged/Waste'),
        ('RETURNED', 'Customer Return'),
        ('MANUAL_ADJUSTMENT', 'Manual Adjustment'),
        ('INITIAL_STOCK', 'Initial Stock'),
        ('ORDER_CANCELLED', 'Order Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name='stock_history'
    )
    
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Stock levels for reference
    stock_before = models.DecimalField(max_digits=10, decimal_places=2)
    stock_after = models.DecimalField(max_digits=10, decimal_places=2)
    
    # References
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_movements'
    )
    order_material = models.ForeignKey(
        OrderMaterial,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_movements'
    )
    supplier_name = models.CharField(max_length=200, blank=True, null=True)
    
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='stock_changes'
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'stock_history'
        ordering = ['-created_at']
        verbose_name_plural = 'Stock History'
        indexes = [
            models.Index(fields=['inventory_item', '-created_at']),
            models.Index(fields=['order', '-created_at']),
        ]

    def __str__(self):
        return f"{self.inventory_item.name} - {self.transaction_type} {self.quantity}"
