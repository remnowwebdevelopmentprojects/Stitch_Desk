from django.db import models
from django.utils import timezone
import uuid
from accounts.models import User
from customers.models import Customer


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
