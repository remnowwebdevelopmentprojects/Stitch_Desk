from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema

from .models import Measurement, MeasurementTemplate
from .serializers import MeasurementSerializer, MeasurementTemplateSerializer


class MeasurementViewSet(viewsets.ModelViewSet):
    """Measurement viewset"""
    serializer_class = MeasurementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Measurement.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).order_by('-created_at')
        
        # Filter by customer if provided
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def perform_destroy(self, instance):
        """Soft delete"""
        instance.is_deleted = True
        instance.save()
    
    @swagger_auto_schema(tags=['Measurements'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Measurements'])
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Measurements'])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Measurements'])
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Measurements'])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class MeasurementTemplateViewSet(viewsets.ModelViewSet):
    """Measurement Template viewset"""
    serializer_class = MeasurementTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = MeasurementTemplate.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).order_by('item_type', '-created_at')
        
        # Filter by item_type if provided
        item_type = self.request.query_params.get('item_type', None)
        if item_type:
            queryset = queryset.filter(item_type=item_type)
        
        # Filter active only if requested
        active_only = self.request.query_params.get('active_only', None)
        if active_only == 'true':
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    def get_serializer_context(self):
        """Add request to serializer context for image URL generation"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def perform_destroy(self, instance):
        """Soft delete"""
        instance.is_deleted = True
        instance.save()
    
    @swagger_auto_schema(tags=['Measurement Templates'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Measurement Templates'])
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Measurement Templates'])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Measurement Templates'])
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Measurement Templates'])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
