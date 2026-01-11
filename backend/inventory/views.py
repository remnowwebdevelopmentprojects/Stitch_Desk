from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.db import transaction
from django.db.models import Sum, F
from decimal import Decimal

from .models import InventoryCategory, InventoryItem, OrderMaterial, StockHistory
from .serializers import (
    InventoryCategorySerializer,
    InventoryItemSerializer,
    InventoryItemListSerializer,
    StockInSerializer,
    StockAdjustmentSerializer,
    OrderMaterialSerializer,
    OrderMaterialCreateSerializer,
    BulkOrderMaterialSerializer,
    StockHistorySerializer,
    InventoryDashboardSerializer,
)
from orders.models import Order


class InventoryCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for inventory categories"""
    serializer_class = InventoryCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return InventoryCategory.objects.filter(
            user=self.request.user,
            is_deleted=False
        )

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            shop=self.request.user.shop
        )

    def perform_destroy(self, instance):
        """Soft delete"""
        instance.is_deleted = True
        instance.save()

    @swagger_auto_schema(tags=['Inventory - Categories'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Categories'])
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Categories'])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Categories'])
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Categories'])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class InventoryItemViewSet(viewsets.ModelViewSet):
    """ViewSet for inventory items"""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return InventoryItemListSerializer
        return InventoryItemSerializer

    def get_queryset(self):
        queryset = InventoryItem.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('category')

        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        # Filter by low stock
        low_stock = self.request.query_params.get('low_stock')
        if low_stock == 'true':
            queryset = queryset.filter(current_stock__lt=F('minimum_stock'))

        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def perform_create(self, serializer):
        item = serializer.save(
            user=self.request.user,
            shop=self.request.user.shop
        )
        # Create initial stock history entry if stock > 0
        if item.current_stock > 0:
            StockHistory.objects.create(
                inventory_item=item,
                transaction_type='IN',
                reason='INITIAL_STOCK',
                quantity=item.current_stock,
                stock_before=0,
                stock_after=item.current_stock,
                notes='Initial stock on item creation',
                created_by=self.request.user
            )

    def perform_destroy(self, instance):
        """Soft delete"""
        instance.is_deleted = True
        instance.save()

    @swagger_auto_schema(tags=['Inventory - Items'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Items'])
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Items'])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Items'])
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Items'])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @swagger_auto_schema(
        method='post',
        operation_description="Add stock to an inventory item",
        request_body=StockInSerializer,
        tags=['Inventory - Items']
    )
    @action(detail=True, methods=['post'])
    def stock_in(self, request, pk=None):
        """Add stock to an item"""
        item = self.get_object()
        serializer = StockInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quantity = Decimal(str(serializer.validated_data['quantity']))
        stock_before = item.current_stock

        with transaction.atomic():
            item.current_stock += quantity
            item.save()

            StockHistory.objects.create(
                inventory_item=item,
                transaction_type='IN',
                reason='PURCHASE',
                quantity=quantity,
                stock_before=stock_before,
                stock_after=item.current_stock,
                supplier_name=serializer.validated_data.get('supplier_name', ''),
                notes=serializer.validated_data.get('notes', ''),
                created_by=request.user
            )

        return Response({
            'message': f'Added {quantity} {item.unit} to {item.name}',
            'current_stock': item.current_stock
        })

    @swagger_auto_schema(
        method='post',
        operation_description="Adjust stock level (for corrections, damaged items, etc.)",
        request_body=StockAdjustmentSerializer,
        tags=['Inventory - Items']
    )
    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """Adjust stock level"""
        item = self.get_object()
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_stock = Decimal(str(serializer.validated_data['new_stock']))
        stock_before = item.current_stock
        difference = new_stock - stock_before

        with transaction.atomic():
            item.current_stock = new_stock
            item.save()

            StockHistory.objects.create(
                inventory_item=item,
                transaction_type='ADJUSTMENT',
                reason=serializer.validated_data['reason'],
                quantity=abs(difference),
                stock_before=stock_before,
                stock_after=new_stock,
                notes=serializer.validated_data.get('notes', ''),
                created_by=request.user
            )

        return Response({
            'message': f'Stock adjusted from {stock_before} to {new_stock}',
            'current_stock': item.current_stock
        })

    @swagger_auto_schema(
        method='get',
        operation_description="Get stock history for an item",
        tags=['Inventory - Items']
    )
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get stock history for an item"""
        item = self.get_object()
        history = item.stock_history.all()[:50]  # Last 50 entries
        serializer = StockHistorySerializer(history, many=True)
        return Response(serializer.data)


class OrderMaterialViewSet(viewsets.ModelViewSet):
    """ViewSet for order materials"""
    serializer_class = OrderMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = OrderMaterial.objects.filter(
            order__user=self.request.user
        ).select_related('inventory_item', 'order')

        # Filter by order
        order_id = self.request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(order_id=order_id)

        return queryset

    @swagger_auto_schema(tags=['Inventory - Order Materials'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Order Materials'])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Inventory - Order Materials'])
    def destroy(self, request, *args, **kwargs):
        """Delete a material and restore stock"""
        instance = self.get_object()
        
        with transaction.atomic():
            # Restore stock
            item = instance.inventory_item
            stock_before = item.current_stock
            item.current_stock += instance.quantity
            item.save()

            # Create history entry for stock restoration
            StockHistory.objects.create(
                inventory_item=item,
                transaction_type='IN',
                reason='ORDER_CANCELLED',
                quantity=instance.quantity,
                stock_before=stock_before,
                stock_after=item.current_stock,
                order=instance.order,
                notes=f'Material removed from order {instance.order.order_number}',
                created_by=request.user
            )

            instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class AddOrderMaterialsView(APIView):
    """Add materials to an order (with stock deduction)"""
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Add materials to an order and deduct from inventory",
        request_body=BulkOrderMaterialSerializer,
        tags=['Inventory - Order Materials']
    )
    def post(self, request, order_id):
        # Verify order exists and belongs to user
        try:
            order = Order.objects.get(id=order_id, user=request.user, is_deleted=False)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = BulkOrderMaterialSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        materials_data = serializer.validated_data['materials']
        created_materials = []
        errors = []

        with transaction.atomic():
            for material_data in materials_data:
                try:
                    item = InventoryItem.objects.get(
                        id=material_data['inventory_item'],
                        user=request.user,
                        is_deleted=False
                    )
                except InventoryItem.DoesNotExist:
                    errors.append({
                        'item': str(material_data['inventory_item']),
                        'error': 'Item not found'
                    })
                    continue

                quantity = Decimal(str(material_data['quantity']))

                # Check stock availability
                if item.current_stock < quantity:
                    errors.append({
                        'item': item.name,
                        'error': f'Insufficient stock. Available: {item.current_stock} {item.unit}'
                    })
                    continue

                stock_before = item.current_stock

                # Deduct stock
                item.current_stock -= quantity
                item.save()

                # Create order material
                order_material = OrderMaterial.objects.create(
                    order=order,
                    inventory_item=item,
                    quantity=quantity,
                    unit_price=None,  # No pricing since we removed purchase_price
                    notes=material_data.get('notes', ''),
                    added_by=request.user
                )

                # Create stock history
                StockHistory.objects.create(
                    inventory_item=item,
                    transaction_type='OUT',
                    reason='ORDER_USAGE',
                    quantity=quantity,
                    stock_before=stock_before,
                    stock_after=item.current_stock,
                    order=order,
                    order_material=order_material,
                    notes=f'Used in order {order.order_number}',
                    created_by=request.user
                )

                created_materials.append(OrderMaterialSerializer(order_material).data)

        if errors and not created_materials:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        response_data = {'materials': created_materials}
        if errors:
            response_data['errors'] = errors

        return Response(response_data, status=status.HTTP_201_CREATED)


class GetOrderMaterialsView(APIView):
    """Get all materials used in an order"""
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get all materials used in an order",
        tags=['Inventory - Order Materials']
    )
    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id, user=request.user, is_deleted=False)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        materials = OrderMaterial.objects.filter(order=order).select_related('inventory_item')
        serializer = OrderMaterialSerializer(materials, many=True)

        # Calculate totals
        total_cost = sum(
            (m.quantity * m.unit_price) if m.unit_price else Decimal('0')
            for m in materials
        )

        return Response({
            'materials': serializer.data,
            'total_cost': total_cost,
            'count': materials.count()
        })


class InventoryDashboardView(APIView):
    """Dashboard stats for inventory"""
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get inventory dashboard statistics",
        tags=['Inventory - Dashboard']
    )
    def get(self, request):
        items = InventoryItem.objects.filter(
            user=request.user,
            is_deleted=False
        )

        total_items = items.count()
        total_categories = InventoryCategory.objects.filter(
            user=request.user,
            is_deleted=False
        ).count()

        low_stock_items = items.filter(current_stock__lt=F('minimum_stock'))
        low_stock_count = low_stock_items.count()

        # Stock value is not calculated since we removed pricing fields
        total_value = Decimal('0')

        # Recently updated items
        recently_updated = items.order_by('-updated_at')[:5]

        return Response({
            'total_items': total_items,
            'total_categories': total_categories,
            'low_stock_count': low_stock_count,
            'total_stock_value': total_value,
            'recently_updated': InventoryItemListSerializer(recently_updated, many=True).data,
            'low_stock_items': InventoryItemListSerializer(low_stock_items[:10], many=True).data,
        })
