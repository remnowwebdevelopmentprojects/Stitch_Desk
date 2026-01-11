from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InventoryCategoryViewSet,
    InventoryItemViewSet,
    OrderMaterialViewSet,
    AddOrderMaterialsView,
    GetOrderMaterialsView,
    InventoryDashboardView,
)

router = DefaultRouter()
router.register(r'inventory/categories', InventoryCategoryViewSet, basename='inventory-category')
router.register(r'inventory/items', InventoryItemViewSet, basename='inventory-item')
router.register(r'inventory/order-materials', OrderMaterialViewSet, basename='order-material')

urlpatterns = [
    path('', include(router.urls)),
    path('orders/<uuid:order_id>/materials/', GetOrderMaterialsView.as_view(), name='order-materials'),
    path('orders/<uuid:order_id>/materials/add/', AddOrderMaterialsView.as_view(), name='add-order-materials'),
    path('inventory/dashboard/', InventoryDashboardView.as_view(), name='inventory-dashboard'),
]
