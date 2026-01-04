from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, login_view, logout_view,
    ItemViewSet, QuotationViewSet, CustomerViewSet,
    MeasurementViewSet, MeasurementTemplateViewSet, OrderViewSet,
    payment_info_view, update_prefixes_view,
    bulk_export_count_view, bulk_export_view,
    view_shared_pdf
)

router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'measurements', MeasurementViewSet, basename='measurement')
router.register(r'measurement-templates', MeasurementTemplateViewSet, basename='measurement-template')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('settings/payment-info/', payment_info_view, name='payment-info'),
    path('settings/prefixes/', update_prefixes_view, name='update-prefixes'),
    path('bulk-export-count/', bulk_export_count_view, name='bulk-export-count'),
    path('bulk-export/', bulk_export_view, name='bulk-export'),
    path('d/<str:token>/', view_shared_pdf, name='view-shared-pdf'),
    path('', include(router.urls)),
]

