from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GalleryCategoryViewSet,
    GalleryItemViewSet,
    GallerySettingsView,
    GalleryAnalyticsViewSet,
    PublicGalleryView,
    PublicGalleryItemView,
)

router = DefaultRouter()
router.register(r'gallery/categories', GalleryCategoryViewSet, basename='gallery-category')
router.register(r'gallery/items', GalleryItemViewSet, basename='gallery-item')
router.register(r'gallery/analytics', GalleryAnalyticsViewSet, basename='gallery-analytics')

urlpatterns = [
    path('', include(router.urls)),
    # Gallery settings (single object per shop)
    path('gallery/settings/', GallerySettingsView.as_view(), name='gallery-settings'),
    # Public gallery endpoints
    path('public/gallery/<uuid:shop_id>/', PublicGalleryView.as_view(), name='public-gallery'),
    path('public/gallery/<uuid:shop_id>/items/<uuid:item_id>/', PublicGalleryItemView.as_view(), name='public-gallery-item'),
]
