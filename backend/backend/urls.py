"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from gallery.views import PublicGalleryView, PublicGalleryItemView

schema_view = get_schema_view(
   openapi.Info(
      title="RemnowInvoice API",
      default_version='v1',
      description="""
      Django REST Framework API for RemnowInvoice application.
      
      ## Authentication Instructions:
      1. First, login at `/api/auth/login/` with your email and password
      2. Copy the `token` from the response
      3. Click the **"Authorize"** button (🔒) at the top right
      4. In the "Value" field, enter: `Token <your-token-here>` (include the word "Token" and a space)
      5. Click "Authorize" and then "Close"
      6. Now you can test authenticated endpoints!
      """,
      terms_of_service="https://www.remnow.co.in/",
      contact=openapi.Contact(email="info@remnow.co.in"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # Public gallery (no /api/ prefix)
    path('gallery/<uuid:shop_id>/', PublicGalleryView.as_view(), name='public-gallery'),
    path('gallery/<uuid:shop_id>/items/<uuid:item_id>/', PublicGalleryItemView.as_view(), name='public-gallery-item'),
    # API URLs
    path('api/', include('accounts.urls')),
    path('api/', include('customers.urls')),
    path('api/', include('measurements.urls')),
    path('api/', include('orders.urls')),
    path('api/', include('invoices.urls')),
    path('api/', include('gallery.urls')),
    # Swagger/OpenAPI URLs
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
