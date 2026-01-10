from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Max
from django.db import models

from .models import GalleryCategory, GalleryItem, GalleryImage, GallerySettings, GalleryAnalytics
from .serializers import (
    GalleryCategorySerializer,
    GalleryItemSerializer,
    GalleryItemCreateSerializer,
    GalleryItemUpdateSerializer,
    GalleryImageSerializer,
    GallerySettingsSerializer,
    GalleryAnalyticsSerializer,
    PublicGallerySerializer,
    PublicGalleryCategorySerializer,
    PublicGalleryItemSerializer,
)
from .utils import compress_image, validate_image_file
from accounts.models import Shop


class GalleryCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing gallery categories"""
    serializer_class = GalleryCategorySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return GalleryCategory.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).order_by('display_order', '-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        # Get max display_order and increment
        max_order = GalleryCategory.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).aggregate(max_order=Max('display_order'))['max_order'] or 0
        
        serializer.save(
            user=self.request.user,
            shop=self.request.user.shop,
            display_order=max_order + 1
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder categories - expects list of {id, display_order}"""
        orders = request.data.get('orders', [])
        
        for item in orders:
            category_id = item.get('id')
            display_order = item.get('display_order')
            
            if category_id and display_order is not None:
                GalleryCategory.objects.filter(
                    id=category_id,
                    user=request.user
                ).update(display_order=display_order)
        
        return Response({'status': 'reordered'})

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle category active status"""
        category = self.get_object()
        category.is_active = not category.is_active
        category.save()
        return Response(GalleryCategorySerializer(category, context={'request': request}).data)


class GalleryItemViewSet(viewsets.ModelViewSet):
    """ViewSet for managing gallery items"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return GalleryItemCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return GalleryItemUpdateSerializer
        return GalleryItemSerializer

    def get_queryset(self):
        queryset = GalleryItem.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).select_related('category').prefetch_related('images')
        
        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Filter by published status
        is_published = self.request.query_params.get('is_published')
        if is_published is not None:
            queryset = queryset.filter(is_published=is_published.lower() == 'true')
        
        # Filter by featured status
        is_featured = self.request.query_params.get('is_featured')
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == 'true')
        
        return queryset.order_by('-is_featured', '-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            shop=self.request.user.shop
        )

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()

    @action(detail=True, methods=['post'])
    def toggle_featured(self, request, pk=None):
        """Toggle item featured status"""
        item = self.get_object()
        item.is_featured = not item.is_featured
        item.save()
        return Response(GalleryItemSerializer(item, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def toggle_published(self, request, pk=None):
        """Toggle item published status"""
        item = self.get_object()
        item.is_published = not item.is_published
        item.save()
        return Response(GalleryItemSerializer(item, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def add_images(self, request, pk=None):
        """Add images to an existing gallery item"""
        item = self.get_object()
        images = request.FILES.getlist('images')
        
        if not images:
            return Response(
                {'error': 'No images provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        existing_count = item.images.count()
        if existing_count + len(images) > 10:
            return Response(
                {'error': f'Maximum 10 images allowed. Currently have {existing_count}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        max_order = item.images.aggregate(
            max_order=Max('display_order')
        )['max_order'] or -1
        
        created_images = []
        for idx, image_file in enumerate(images):
            is_valid, error = validate_image_file(image_file)
            if not is_valid:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            
            compressed = compress_image(image_file)
            gallery_image = GalleryImage.objects.create(
                gallery_item=item,
                image=compressed,
                display_order=max_order + idx + 1
            )
            created_images.append(gallery_image)
        
        return Response(
            GalleryImageSerializer(created_images, many=True, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def reorder_images(self, request, pk=None):
        """Reorder images - expects list of {id, display_order}"""
        item = self.get_object()
        orders = request.data.get('orders', [])
        
        for order_item in orders:
            image_id = order_item.get('id')
            display_order = order_item.get('display_order')
            
            if image_id and display_order is not None:
                GalleryImage.objects.filter(
                    id=image_id,
                    gallery_item=item
                ).update(display_order=display_order)
        
        return Response({'status': 'reordered'})

    @action(detail=True, methods=['delete'], url_path='images/(?P<image_id>[^/.]+)')
    def delete_image(self, request, pk=None, image_id=None):
        """Delete a specific image from a gallery item"""
        item = self.get_object()
        image = get_object_or_404(GalleryImage, id=image_id, gallery_item=item)
        
        # Delete the actual file
        if image.image:
            image.image.delete(save=False)
        image.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class GallerySettingsView(APIView):
    """API view for managing gallery settings (single object per shop)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get or create settings for the shop"""
        settings, created = GallerySettings.objects.get_or_create(
            shop=request.user.shop,
            defaults={
                'whatsapp_number': request.user.shop.phone_number if hasattr(request.user, 'shop') else ''
            }
        )
        serializer = GallerySettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        """Update settings for the shop"""
        settings, created = GallerySettings.objects.get_or_create(
            shop=request.user.shop
        )
        serializer = GallerySettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        """Update settings for the shop"""
        settings, created = GallerySettings.objects.get_or_create(
            shop=request.user.shop
        )
        serializer = GallerySettingsSerializer(settings, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GalleryAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing gallery analytics"""
    serializer_class = GalleryAnalyticsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GalleryAnalytics.objects.filter(
            shop=self.request.user.shop
        ).order_by('-date')

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get analytics summary"""
        from django.db.models import Sum
        from datetime import timedelta
        
        today = timezone.now().date()
        last_30_days = today - timedelta(days=30)
        
        analytics = GalleryAnalytics.objects.filter(
            shop=request.user.shop,
            date__gte=last_30_days
        )
        
        summary = analytics.aggregate(
            total_views=Sum('total_views'),
            total_unique_visitors=Sum('unique_visitors')
        )
        
        # Get daily breakdown
        daily = list(analytics.values('date', 'total_views', 'unique_visitors').order_by('date'))
        
        return Response({
            'total_views': summary['total_views'] or 0,
            'total_unique_visitors': summary['total_unique_visitors'] or 0,
            'daily_breakdown': daily
        })


class PublicGalleryView(APIView):
    """Public gallery view - no authentication required"""
    permission_classes = [AllowAny]

    def get(self, request, shop_id):
        """Get public gallery for a shop"""
        # Get the shop
        shop = get_object_or_404(Shop, id=shop_id)
        
        # Get gallery settings
        try:
            settings = GallerySettings.objects.get(shop=shop)
        except GallerySettings.DoesNotExist:
            settings = None
        
        # Check if public gallery is enabled
        if settings and not settings.is_public_enabled:
            return Response(
                {'error': 'Gallery is not publicly available'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get categories
        categories_queryset = GalleryCategory.objects.filter(
            shop=shop,
            is_active=True,
            is_deleted=False
        ).order_by('display_order')
        
        # Filter by public_category_ids if set
        if settings and settings.public_category_ids:
            categories_queryset = categories_queryset.filter(
                id__in=settings.public_category_ids
            )
        
        # Get items
        items_queryset = GalleryItem.objects.filter(
            shop=shop,
            is_published=True,
            is_deleted=False
        ).select_related('category').prefetch_related('images').order_by('-is_featured', '-created_at')
        
        # Filter items by category if requested
        category_filter = request.query_params.get('category')
        if category_filter:
            items_queryset = items_queryset.filter(category_id=category_filter)
        
        # Track analytics
        self._track_view(shop, request, category_filter)
        
        # Prepare response
        show_prices = settings.show_prices if settings else True
        
        context = {
            'request': request,
            'show_prices': show_prices
        }
        
        response_data = {
            'shop_name': shop.shop_name,
            'shop_logo': request.build_absolute_uri(shop.logo.url) if shop.logo else None,
            'whatsapp_number': settings.whatsapp_number if settings else shop.phone_number,
            'enquiry_message_template': settings.enquiry_message_template if settings else "Hi! I'm interested in this item from your gallery: {item_title}",
            'show_prices': show_prices,
            'categories': PublicGalleryCategorySerializer(categories_queryset, many=True, context=context).data,
            'items': PublicGalleryItemSerializer(items_queryset, many=True, context=context).data
        }
        
        return Response(response_data)

    def _track_view(self, shop, request, category_id=None):
        """Track gallery view analytics"""
        today = timezone.now().date()
        
        analytics, created = GalleryAnalytics.objects.get_or_create(
            shop=shop,
            date=today,
            defaults={'total_views': 0, 'unique_visitors': 0}
        )
        
        analytics.total_views += 1
        
        # Track category view if filtering by category
        if category_id:
            category_views = analytics.category_views or {}
            category_views[str(category_id)] = category_views.get(str(category_id), 0) + 1
            analytics.category_views = category_views
        
        analytics.save()


class PublicGalleryItemView(APIView):
    """View single gallery item - no authentication required"""
    permission_classes = [AllowAny]

    def get(self, request, shop_id, item_id):
        """Get a single gallery item"""
        shop = get_object_or_404(Shop, id=shop_id)
        
        # Get gallery settings
        try:
            settings = GallerySettings.objects.get(shop=shop)
        except GallerySettings.DoesNotExist:
            settings = None
        
        # Check if public gallery is enabled
        if settings and not settings.is_public_enabled:
            return Response(
                {'error': 'Gallery is not publicly available'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the item
        item = get_object_or_404(
            GalleryItem,
            id=item_id,
            shop=shop,
            is_published=True,
            is_deleted=False
        )
        
        # Track item view
        self._track_item_view(shop, item_id)
        
        show_prices = settings.show_prices if settings else True
        context = {
            'request': request,
            'show_prices': show_prices
        }
        
        return Response(PublicGalleryItemSerializer(item, context=context).data)

    def _track_item_view(self, shop, item_id):
        """Track item view analytics"""
        today = timezone.now().date()
        
        analytics, created = GalleryAnalytics.objects.get_or_create(
            shop=shop,
            date=today,
            defaults={'total_views': 0, 'unique_visitors': 0}
        )
        
        item_views = analytics.item_views or {}
        item_views[str(item_id)] = item_views.get(str(item_id), 0) + 1
        analytics.item_views = item_views
        analytics.save()
