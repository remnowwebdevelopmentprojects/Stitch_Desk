from django.contrib import admin
from .models import GalleryCategory, GalleryItem, GalleryImage, GallerySettings, GalleryAnalytics


class GalleryImageInline(admin.TabularInline):
    model = GalleryImage
    extra = 1
    fields = ['image', 'display_order']


@admin.register(GalleryCategory)
class GalleryCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'shop', 'is_active', 'display_order', 'created_at']
    list_filter = ['is_active', 'is_deleted', 'shop']
    search_fields = ['name', 'description']
    ordering = ['shop', 'display_order']


@admin.register(GalleryItem)
class GalleryItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'shop', 'category', 'price', 'availability_status', 'is_featured', 'is_published', 'created_at']
    list_filter = ['availability_status', 'is_featured', 'is_published', 'is_deleted', 'shop', 'category']
    search_fields = ['title', 'description']
    inlines = [GalleryImageInline]
    ordering = ['-created_at']


@admin.register(GalleryImage)
class GalleryImageAdmin(admin.ModelAdmin):
    list_display = ['gallery_item', 'display_order', 'created_at']
    list_filter = ['gallery_item__shop']
    ordering = ['gallery_item', 'display_order']


@admin.register(GallerySettings)
class GallerySettingsAdmin(admin.ModelAdmin):
    list_display = ['shop', 'is_public_enabled', 'show_prices', 'whatsapp_number', 'updated_at']
    list_filter = ['is_public_enabled', 'show_prices']


@admin.register(GalleryAnalytics)
class GalleryAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['shop', 'date', 'total_views', 'unique_visitors']
    list_filter = ['shop', 'date']
    ordering = ['-date']
