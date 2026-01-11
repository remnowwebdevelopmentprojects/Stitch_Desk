from rest_framework import serializers
from .models import InventoryCategory, InventoryItem, OrderMaterial, StockHistory


class InventoryCategorySerializer(serializers.ModelSerializer):
    """Serializer for inventory categories"""
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryCategory
        fields = [
            'id', 'name', 'description', 'default_unit',
            'is_active', 'items_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'items_count', 'created_at', 'updated_at']
    
    def get_items_count(self, obj):
        return obj.items.filter(is_deleted=False).count()
    
    def validate(self, attrs):
        # Check for duplicate category name within the same shop
        user = self.context['request'].user
        shop = user.shop
        name = attrs.get('name')
        
        # For create operation
        if not self.instance:
            if InventoryCategory.objects.filter(shop=shop, name=name, is_deleted=False).exists():
                raise serializers.ValidationError({'name': 'A category with this name already exists.'})
        # For update operation
        else:
            if InventoryCategory.objects.filter(shop=shop, name=name, is_deleted=False).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({'name': 'A category with this name already exists.'})
        
        return attrs


class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for inventory items"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = InventoryItem
        fields = [
            'id', 'name', 'description', 'sku', 'category', 'category_name',
            'unit', 'current_stock', 'minimum_stock', 'notes',
            'is_active', 'is_low_stock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'category_name', 'is_low_stock', 'created_at', 'updated_at']


class InventoryItemListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns/lists"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = InventoryItem
        fields = ['id', 'name', 'category_name', 'unit', 'current_stock', 'is_low_stock']


class StockInSerializer(serializers.Serializer):
    """Serializer for adding stock"""
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    supplier_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class StockAdjustmentSerializer(serializers.Serializer):
    """Serializer for stock adjustments"""
    new_stock = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    reason = serializers.ChoiceField(choices=[
        ('DAMAGED', 'Damaged/Waste'),
        ('MANUAL_ADJUSTMENT', 'Manual Adjustment'),
    ])
    notes = serializers.CharField(required=False, allow_blank=True)


class OrderMaterialSerializer(serializers.ModelSerializer):
    """Serializer for materials used in orders"""
    item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    item_unit = serializers.CharField(source='inventory_item.unit', read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderMaterial
        fields = [
            'id', 'order', 'inventory_item', 'item_name', 'item_unit',
            'quantity', 'unit_price', 'total_cost', 'notes',
            'added_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'item_name', 'item_unit', 'total_cost', 'added_by', 'created_at', 'updated_at']


class OrderMaterialCreateSerializer(serializers.Serializer):
    """Serializer for creating order materials"""
    inventory_item = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    notes = serializers.CharField(required=False, allow_blank=True)


class BulkOrderMaterialSerializer(serializers.Serializer):
    """Serializer for adding multiple materials to an order"""
    materials = OrderMaterialCreateSerializer(many=True)


class StockHistorySerializer(serializers.ModelSerializer):
    """Serializer for stock history"""
    item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = StockHistory
        fields = [
            'id', 'inventory_item', 'item_name', 'transaction_type', 'reason',
            'quantity', 'stock_before', 'stock_after',
            'order', 'order_number', 'supplier_name', 'notes',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'item_name', 'order_number', 'created_by_name', 'created_at']


class InventoryDashboardSerializer(serializers.Serializer):
    """Serializer for inventory dashboard stats"""
    total_items = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    total_stock_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    recently_updated = InventoryItemListSerializer(many=True)
    low_stock_items = InventoryItemListSerializer(many=True)
