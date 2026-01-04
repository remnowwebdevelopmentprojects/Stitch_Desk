from django.contrib import admin
from .models import Quotation, Item


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['description', 'hsn_code', 'default_rate', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['description', 'hsn_code']
    ordering = ['-created_at']


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['quotation_no', 'document_type', 'payment_status', 'total_amount', 'user', 'created_at']
    list_filter = ['document_type', 'payment_status', 'currency', 'created_at']
    search_fields = ['quotation_no', 'to_address']
    ordering = ['-created_at']
