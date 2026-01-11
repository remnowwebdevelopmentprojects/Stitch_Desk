from django.urls import path
from . import views

app_name = 'subscriptions'

urlpatterns = [
    # ==================== SUPER ADMIN ENDPOINTS ====================
    # Subscription Plans Management
    path('admin/plans/', views.subscription_plan_list_create, name='admin-plans-list-create'),
    path('admin/plans/<int:pk>/', views.subscription_plan_detail, name='admin-plan-detail'),

    # User Subscriptions Management
    path('admin/subscriptions/', views.all_subscriptions_list, name='admin-subscriptions-list'),
    path('admin/subscriptions/user/<int:user_id>/', views.user_subscription_detail, name='admin-user-subscription'),
    path('admin/subscriptions/user/<int:user_id>/assign-plan/', views.assign_custom_plan, name='admin-assign-plan'),
    path('admin/users/create/', views.create_user_with_subscription, name='admin-create-user'),

    # Payments Management
    path('admin/payments/', views.all_payments_list, name='admin-payments-list'),

    # Statistics
    path('admin/stats/', views.subscription_stats, name='admin-stats'),

    # ==================== USER-FACING ENDPOINTS ====================
    # Public plan listing
    path('plans/', views.active_plans_list, name='plans-list'),

    # User subscription management
    path('my-subscription/', views.my_subscription, name='my-subscription'),
    path('subscribe/', views.create_subscription_order, name='create-order'),
    path('verify-payment/', views.verify_payment, name='verify-payment'),
    path('cancel/', views.cancel_subscription, name='cancel-subscription'),

    # Razorpay webhook
    path('webhook/', views.razorpay_webhook, name='razorpay-webhook'),
]
