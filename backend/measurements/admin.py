from django.contrib import admin
from .models import Measurement, MeasurementTemplate


@admin.register(MeasurementTemplate)
class MeasurementTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'item_type', 'user', 'is_active', 'created_at']
    list_filter = ['item_type', 'is_active', 'created_at']
    search_fields = ['name']
    ordering = ['item_type', '-created_at']


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ['customer', 'template', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['customer__name']
    ordering = ['-created_at']
