import uuid
from django.db import models
from django.utils import timezone
from accounts.models import User, Shop


class GalleryCategory(models.Model):
    """Categories for organizing gallery items"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gallery_categories')
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='gallery_categories')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    cover_image = models.ImageField(upload_to='gallery/categories/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gallery_categories'
        ordering = ['display_order', '-created_at']
        verbose_name_plural = 'Gallery Categories'

    def __str__(self):
        return f"{self.name} - {self.shop.shop_name}"


class GalleryItem(models.Model):
    """Individual gallery items / works / products"""
    
    AVAILABILITY_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('CUSTOM_ORDER_ONLY', 'Custom Order Only'),
        ('NOT_ACCEPTING', 'Not Accepting Orders'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gallery_items')
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='gallery_items')
    category = models.ForeignKey(
        GalleryCategory, 
        on_delete=models.SET_NULL, 
        related_name='items',
        blank=True, 
        null=True
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    availability_status = models.CharField(
        max_length=20, 
        choices=AVAILABILITY_CHOICES, 
        default='AVAILABLE'
    )
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gallery_items'
        ordering = ['-is_featured', '-created_at']
        indexes = [
            models.Index(fields=['shop', 'is_published', 'is_deleted']),
            models.Index(fields=['category', 'is_published']),
        ]

    def __str__(self):
        return f"{self.title} - {self.shop.shop_name}"


class GalleryImage(models.Model):
    """Images associated with gallery items"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gallery_item = models.ForeignKey(
        GalleryItem, 
        on_delete=models.CASCADE, 
        related_name='images'
    )
    image = models.ImageField(upload_to='gallery/items/')
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'gallery_images'
        ordering = ['display_order', 'created_at']

    def __str__(self):
        return f"Image for {self.gallery_item.title}"


class GallerySettings(models.Model):
    """Shop-specific gallery settings"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.OneToOneField(Shop, on_delete=models.CASCADE, related_name='gallery_settings')
    is_public_enabled = models.BooleanField(default=True)
    show_prices = models.BooleanField(default=True)
    whatsapp_number = models.CharField(max_length=20, blank=True, null=True)
    enquiry_message_template = models.TextField(
        default="Hi! I'm interested in this item from your gallery: {item_title}",
        blank=True
    )
    # Future-ready password protection
    access_password = models.CharField(max_length=255, blank=True, null=True)
    # Categories to show publicly (empty = all active categories)
    public_category_ids = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gallery_settings'
        verbose_name_plural = 'Gallery Settings'

    def __str__(self):
        return f"Gallery Settings - {self.shop.shop_name}"


class GalleryAnalytics(models.Model):
    """Daily analytics for gallery views"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='gallery_analytics')
    date = models.DateField(default=timezone.now)
    total_views = models.PositiveIntegerField(default=0)
    unique_visitors = models.PositiveIntegerField(default=0)
    item_views = models.JSONField(default=dict, blank=True)  # {item_id: view_count}
    category_views = models.JSONField(default=dict, blank=True)  # {category_id: view_count}
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gallery_analytics'
        unique_together = ['shop', 'date']
        ordering = ['-date']
        verbose_name_plural = 'Gallery Analytics'

    def __str__(self):
        return f"Analytics {self.date} - {self.shop.shop_name}"
