from django.contrib import admin
from .models import InventoryCategory, InventoryItem, OrderMaterial, StockHistory


@admin.register(InventoryCategory)
class InventoryCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'shop', 'default_unit', 'is_active', 'created_at']
    list_filter = ['is_active', 'default_unit']
    search_fields = ['name', 'shop__shop_name']


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'current_stock', 'unit', 'minimum_stock', 'is_low_stock', 'is_active']
    list_filter = ['category', 'is_active', 'unit']
    search_fields = ['name', 'sku', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(OrderMaterial)
class OrderMaterialAdmin(admin.ModelAdmin):
    list_display = ['order', 'inventory_item', 'quantity', 'unit_price', 'created_at']
    list_filter = ['created_at']
    search_fields = ['order__order_number', 'inventory_item__name']


@admin.register(StockHistory)
class StockHistoryAdmin(admin.ModelAdmin):
    list_display = ['inventory_item', 'transaction_type', 'reason', 'quantity', 'stock_before', 'stock_after', 'created_at']
    list_filter = ['transaction_type', 'reason', 'created_at']
    search_fields = ['inventory_item__name', 'order__order_number', 'notes']
    readonly_fields = ['created_at']
