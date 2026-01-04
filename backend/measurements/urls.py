from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MeasurementViewSet, MeasurementTemplateViewSet

router = DefaultRouter()
router.register(r'measurements', MeasurementViewSet, basename='measurement')
router.register(r'measurement-templates', MeasurementTemplateViewSet, basename='measurement-template')

urlpatterns = [
    path('', include(router.urls)),
]

