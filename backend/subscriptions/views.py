from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import razorpay
import hmac
import hashlib
from .models import SubscriptionPlan, Subscription, Payment
from .serializers import SubscriptionPlanSerializer, SubscriptionSerializer, PaymentSerializer
from accounts.models import User

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(
    settings.RAZORPAY_KEY_ID,
    settings.RAZORPAY_KEY_SECRET
))


class IsSuperAdmin(IsAuthenticated):
    """Permission class to check if user is superuser"""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_superuser


# ==================== SUPER ADMIN ENDPOINTS ====================

@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def subscription_plan_list_create(request):
    """
    GET: List all subscription plans (including inactive)
    POST: Create a new subscription plan (including custom plans)
    """
    if request.method == 'GET':
        plans = SubscriptionPlan.objects.all()
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = SubscriptionPlanSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsSuperAdmin])
def subscription_plan_detail(request, pk):
    """
    GET: Retrieve a specific plan
    PUT/PATCH: Update a plan
    DELETE: Delete a plan (soft delete by setting is_active=False)
    """
    plan = get_object_or_404(SubscriptionPlan, pk=pk)

    if request.method == 'GET':
        serializer = SubscriptionPlanSerializer(plan)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = SubscriptionPlanSerializer(plan, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Soft delete - set is_active to False instead of actual deletion
        plan.is_active = False
        plan.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def all_subscriptions_list(request):
    """
    List all user subscriptions with filtering options
    Query params: status, plan_type
    """
    subscriptions = Subscription.objects.all().select_related('user', 'plan')

    # Filter by status
    status_filter = request.GET.get('status')
    if status_filter:
        subscriptions = subscriptions.filter(status=status_filter)

    # Filter by plan type
    plan_type = request.GET.get('plan_type')
    if plan_type:
        subscriptions = subscriptions.filter(plan__plan_type=plan_type)

    serializer = SubscriptionSerializer(subscriptions, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsSuperAdmin])
def user_subscription_detail(request, user_id):
    """
    GET: Get a specific user's subscription
    PATCH: Update a user's subscription (assign custom plan, extend trial, etc.)
    """
    subscription = get_object_or_404(Subscription, user_id=user_id)

    if request.method == 'GET':
        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = SubscriptionSerializer(subscription, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def assign_custom_plan(request, user_id):
    """
    Assign a custom plan to a specific user
    Body: { "plan_id": 1, "start_date": "2024-01-01", "end_date": "2024-12-31" }
    """
    subscription = get_object_or_404(Subscription, user_id=user_id)
    plan_id = request.data.get('plan_id')
    start_date = request.data.get('start_date')
    end_date = request.data.get('end_date')

    if not plan_id:
        return Response({'error': 'plan_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    plan = get_object_or_404(SubscriptionPlan, pk=plan_id)

    subscription.plan = plan
    subscription.status = 'active'

    if start_date:
        subscription.start_date = start_date
    else:
        subscription.start_date = timezone.now()

    if end_date:
        subscription.end_date = end_date

    subscription.save()

    serializer = SubscriptionSerializer(subscription)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def create_user_with_subscription(request):
    """
    Create a new user with subscription details
    Body: {
        "email": "user@example.com",
        "name": "User Name",
        "password": "password123",
        "plan_id": 1,
        "end_date": "2025-12-31"  # Optional
    }
    """
    email = request.data.get('email')
    name = request.data.get('name')
    password = request.data.get('password')
    plan_id = request.data.get('plan_id')
    end_date = request.data.get('end_date')

    # Validate required fields
    if not all([email, name, password]):
        return Response({
            'error': 'email, name, and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return Response({
            'error': 'User with this email already exists'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate plan if provided
    plan = None
    if plan_id:
        try:
            plan = SubscriptionPlan.objects.get(pk=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response({
                'error': 'Invalid plan_id'
            }, status=status.HTTP_400_BAD_REQUEST)

    # Create user
    user = User.objects.create_user(
        email=email,
        name=name,
        password=password
    )

    # Update subscription if plan is provided
    if plan:
        subscription = user.subscription
        subscription.plan = plan
        subscription.status = 'active'
        subscription.start_date = timezone.now()

        if end_date:
            subscription.end_date = end_date

        subscription.save()

        # Serialize response with subscription details
        return Response({
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'is_superuser': user.is_superuser
            },
            'subscription': SubscriptionSerializer(subscription).data
        }, status=status.HTTP_201_CREATED)

    # Return user without subscription if no plan
    return Response({
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'is_superuser': user.is_superuser
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def all_payments_list(request):
    """
    List all payments with filtering
    Query params: status, subscription_id
    """
    payments = Payment.objects.all().select_related('subscription', 'subscription__user')

    # Filter by status
    status_filter = request.GET.get('status')
    if status_filter:
        payments = payments.filter(status=status_filter)

    # Filter by subscription
    subscription_id = request.GET.get('subscription_id')
    if subscription_id:
        payments = payments.filter(subscription_id=subscription_id)

    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def subscription_stats(request):
    """
    Get subscription statistics for dashboard
    """
    total_users = User.objects.count()
    trial_users = Subscription.objects.filter(status='trial').count()
    active_users = Subscription.objects.filter(status='active').count()
    cancelled_users = Subscription.objects.filter(status='cancelled').count()
    expired_users = Subscription.objects.filter(status='expired').count()

    # Revenue stats
    total_revenue = Payment.objects.filter(status='completed').aggregate(
        total=models.Sum('amount')
    )['total'] or 0

    # Plan distribution
    plan_distribution = SubscriptionPlan.objects.annotate(
        subscriber_count=models.Count('subscription')
    ).values('name', 'plan_type', 'subscriber_count')

    return Response({
        'total_users': total_users,
        'trial_users': trial_users,
        'active_users': active_users,
        'cancelled_users': cancelled_users,
        'expired_users': expired_users,
        'total_revenue': float(total_revenue),
        'plan_distribution': list(plan_distribution),
    })


# ==================== USER-FACING ENDPOINTS ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def active_plans_list(request):
    """
    GET: List all active subscription plans for public display
    """
    plans = SubscriptionPlan.objects.filter(is_active=True).order_by('price')
    serializer = SubscriptionPlanSerializer(plans, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_subscription(request):
    """
    GET: Get current user's subscription details
    """
    try:
        subscription = request.user.subscription
        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data)
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_subscription_order(request):
    """
    Create a Razorpay Subscription with autopay
    Body: { "plan_id": 1 }
    """
    plan_id = request.data.get('plan_id')

    if not plan_id:
        return Response({'error': 'plan_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        plan = SubscriptionPlan.objects.get(pk=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Invalid plan'}, status=status.HTTP_404_NOT_FOUND)

    # Check if plan has Razorpay Plan ID
    if not plan.razorpay_plan_id:
        return Response({
            'error': 'This plan is not configured with Razorpay. Please create a plan in Razorpay Dashboard and add the plan_id to this subscription plan.'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_subscription = request.user.subscription

        # Create or get Razorpay customer
        if not user_subscription.razorpay_customer_id:
            customer_data = {
                'name': request.user.name,
                'email': request.user.email,
                'notes': {
                    'user_id': request.user.id
                }
            }
            razorpay_customer = razorpay_client.customer.create(data=customer_data)
            user_subscription.razorpay_customer_id = razorpay_customer['id']
            user_subscription.save()

        # Create Razorpay Subscription
        subscription_data = {
            'plan_id': plan.razorpay_plan_id,
            'customer_id': user_subscription.razorpay_customer_id,
            'total_count': 12 if plan.billing_cycle == 'monthly' else 1,  # 12 months for monthly, 1 for yearly
            'quantity': 1,
            'customer_notify': 1,  # Email customer
            'notes': {
                'user_id': request.user.id,
                'plan_id': plan.id,
                'plan_name': plan.name
            }
        }

        razorpay_subscription = razorpay_client.subscription.create(data=subscription_data)

        # Store subscription ID
        user_subscription.razorpay_subscription_id = razorpay_subscription['id']
        user_subscription.save()

        # Create initial payment record
        Payment.objects.create(
            subscription=user_subscription,
            amount=plan.price,
            currency='INR',
            status='pending',
            razorpay_order_id=razorpay_subscription.get('id')  # Store subscription ID as order reference
        )

        return Response({
            'subscription_id': razorpay_subscription['id'],
            'key_id': settings.RAZORPAY_KEY_ID,
            'customer_id': user_subscription.razorpay_customer_id,
            'plan_name': plan.name,
            'amount': int(float(plan.price) * 100),  # Amount in paise for frontend
            'currency': 'INR'
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    Verify Razorpay subscription payment and activate subscription
    Body: {
        "razorpay_payment_id": "...",
        "razorpay_subscription_id": "...",
        "razorpay_signature": "...",
        "plan_id": 1
    }
    """
    razorpay_payment_id = request.data.get('razorpay_payment_id')
    razorpay_subscription_id = request.data.get('razorpay_subscription_id')
    razorpay_signature = request.data.get('razorpay_signature')
    plan_id = request.data.get('plan_id')

    if not all([razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan_id]):
        return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Verify payment signature
        params_dict = {
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_subscription_id': razorpay_subscription_id,
            'razorpay_signature': razorpay_signature
        }

        # Verify signature
        generated_signature = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            f"{razorpay_payment_id}|{razorpay_subscription_id}".encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_signature != razorpay_signature:
            return Response({'error': 'Payment verification failed'}, status=status.HTTP_400_BAD_REQUEST)

        # Get plan
        plan = SubscriptionPlan.objects.get(pk=plan_id)

        # Fetch subscription details from Razorpay
        razorpay_sub = razorpay_client.subscription.fetch(razorpay_subscription_id)

        # Update payment record
        try:
            payment = Payment.objects.filter(
                subscription=request.user.subscription,
                razorpay_order_id=razorpay_subscription_id
            ).first()

            if payment:
                payment.razorpay_payment_id = razorpay_payment_id
                payment.razorpay_signature = razorpay_signature
                payment.status = 'completed'
                payment.save()
        except Exception:
            # Create new payment record if not found
            Payment.objects.create(
                subscription=request.user.subscription,
                amount=plan.price,
                currency='INR',
                status='completed',
                razorpay_payment_id=razorpay_payment_id,
                razorpay_order_id=razorpay_subscription_id,
                razorpay_signature=razorpay_signature
            )

        # Update subscription
        subscription = request.user.subscription
        subscription.plan = plan
        subscription.status = 'active'
        subscription.start_date = timezone.now()
        subscription.razorpay_subscription_id = razorpay_subscription_id

        # Calculate end date based on billing cycle
        if plan.billing_cycle == 'monthly':
            subscription.end_date = subscription.start_date + timedelta(days=30)
        else:  # yearly
            subscription.end_date = subscription.start_date + timedelta(days=365)

        subscription.save()

        serializer = SubscriptionSerializer(subscription)
        return Response({
            'message': 'Payment successful - Your subscription will auto-renew',
            'subscription': serializer.data
        })

    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Invalid plan'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """
    Cancel user's Razorpay subscription (immediate cancellation)
    """
    try:
        subscription = request.user.subscription

        # Cancel Razorpay subscription if exists
        if subscription.razorpay_subscription_id:
            try:
                razorpay_client.subscription.cancel(
                    subscription.razorpay_subscription_id,
                    data={'cancel_at_cycle_end': 0}  # Cancel immediately
                )
            except Exception as e:
                return Response({
                    'error': f'Failed to cancel Razorpay subscription: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Update local subscription
        subscription.status = 'cancelled'
        subscription.cancel_at_period_end = True
        subscription.cancelled_at = timezone.now()
        subscription.save()

        serializer = SubscriptionSerializer(subscription)
        return Response({
            'message': 'Subscription cancelled successfully',
            'subscription': serializer.data
        })
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    """
    Handle Razorpay webhooks for subscription events
    Events: subscription.charged, subscription.cancelled, subscription.completed, payment.failed
    """
    # Verify webhook signature
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET if hasattr(settings, 'RAZORPAY_WEBHOOK_SECRET') else None
    webhook_signature = request.headers.get('X-Razorpay-Signature', '')
    webhook_body = request.body.decode('utf-8')

    if webhook_secret:
        # Verify signature
        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            webhook_body.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        if webhook_signature != expected_signature:
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

    # Process webhook event
    event = request.data.get('event')
    payload = request.data.get('payload', {})

    # Subscription charged (recurring payment successful)
    if event == 'subscription.charged':
        subscription_entity = payload.get('subscription', {}).get('entity', {})
        payment_entity = payload.get('payment', {}).get('entity', {})

        subscription_id = subscription_entity.get('id')

        try:
            subscription = Subscription.objects.get(razorpay_subscription_id=subscription_id)

            # Create payment record
            Payment.objects.create(
                subscription=subscription,
                amount=payment_entity.get('amount', 0) / 100,  # Convert from paise
                currency='INR',
                status='completed',
                razorpay_payment_id=payment_entity.get('id'),
                razorpay_order_id=subscription_id
            )

            # Update subscription status and extend end date
            subscription.status = 'active'
            if subscription.plan:
                if subscription.plan.billing_cycle == 'monthly':
                    subscription.end_date = timezone.now() + timedelta(days=30)
                else:
                    subscription.end_date = timezone.now() + timedelta(days=365)
            subscription.save()

        except Subscription.DoesNotExist:
            pass

    # Subscription cancelled
    elif event == 'subscription.cancelled':
        subscription_entity = payload.get('subscription', {}).get('entity', {})
        subscription_id = subscription_entity.get('id')

        try:
            subscription = Subscription.objects.get(razorpay_subscription_id=subscription_id)
            subscription.status = 'cancelled'
            subscription.cancelled_at = timezone.now()
            subscription.save()
        except Subscription.DoesNotExist:
            pass

    # Subscription completed (all payments done)
    elif event == 'subscription.completed':
        subscription_entity = payload.get('subscription', {}).get('entity', {})
        subscription_id = subscription_entity.get('id')

        try:
            subscription = Subscription.objects.get(razorpay_subscription_id=subscription_id)
            subscription.status = 'expired'
            subscription.save()
        except Subscription.DoesNotExist:
            pass

    # Payment failed
    elif event == 'subscription.halted' or event == 'payment.failed':
        subscription_entity = payload.get('subscription', {}).get('entity', {})
        payment_entity = payload.get('payment', {}).get('entity', {})

        subscription_id = subscription_entity.get('id')

        try:
            subscription = Subscription.objects.get(razorpay_subscription_id=subscription_id)

            # Create failed payment record
            Payment.objects.create(
                subscription=subscription,
                amount=payment_entity.get('amount', 0) / 100,
                currency='INR',
                status='failed',
                razorpay_payment_id=payment_entity.get('id'),
                razorpay_order_id=subscription_id
            )

            subscription.status = 'payment_failed'
            subscription.save()
        except Subscription.DoesNotExist:
            pass

    # Subscription authenticated (customer completed payment)
    elif event == 'subscription.authenticated':
        subscription_entity = payload.get('subscription', {}).get('entity', {})
        subscription_id = subscription_entity.get('id')

        try:
            subscription = Subscription.objects.get(razorpay_subscription_id=subscription_id)
            subscription.status = 'active'
            subscription.save()
        except Subscription.DoesNotExist:
            pass

    return Response({'status': 'success'})


# Import models for aggregation
from django.db import models
