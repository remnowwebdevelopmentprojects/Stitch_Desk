from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ItemViewSet, QuotationViewSet, InvoiceViewSet,
    bulk_export_count_view, bulk_export_view,
    view_shared_pdf
)

router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('bulk-export-count/', bulk_export_count_view, name='bulk-export-count'),
    path('bulk-export/', bulk_export_view, name='bulk-export'),
    path('d/<str:token>/', view_shared_pdf, name='view-shared-pdf'),
    path('', include(router.urls)),
]

