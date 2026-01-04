from django.urls import path
from .views import (
    RegisterView, login_view, logout_view,
    payment_info_view, update_prefixes_view,
    business_settings_view, order_settings_view, invoice_settings_view,
    payment_methods_view, payment_method_detail_view,
    change_password_view, toggle_2fa_view, verify_2fa_otp_view,
    send_login_otp_view, verify_login_otp_view, all_settings_view,
    forgot_password_view, reset_password_view
)

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    
    # 2FA Login
    path('auth/2fa/send-otp/', send_login_otp_view, name='send-login-otp'),
    path('auth/2fa/verify-otp/', verify_login_otp_view, name='verify-login-otp'),
    
    # Legacy settings (keep for backward compatibility)
    path('settings/payment-info/', payment_info_view, name='payment-info'),
    path('settings/prefixes/', update_prefixes_view, name='update-prefixes'),
    
    # New settings endpoints
    path('settings/', all_settings_view, name='all-settings'),
    path('settings/business/', business_settings_view, name='business-settings'),
    path('settings/order/', order_settings_view, name='order-settings'),
    path('settings/invoice/', invoice_settings_view, name='invoice-settings'),
    path('settings/payment-methods/', payment_methods_view, name='payment-methods'),
    path('settings/payment-methods/<uuid:pk>/', payment_method_detail_view, name='payment-method-detail'),
    
    # Security settings
    path('settings/security/change-password/', change_password_view, name='change-password'),
    path('settings/security/2fa/toggle/', toggle_2fa_view, name='toggle-2fa'),
    path('settings/security/2fa/verify/', verify_2fa_otp_view, name='verify-2fa-otp'),
    
    # Forgot password
    path('auth/forgot-password/', forgot_password_view, name='forgot-password'),
    path('auth/reset-password/', reset_password_view, name='reset-password'),
]

