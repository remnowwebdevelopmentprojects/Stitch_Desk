from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from django.shortcuts import redirect
from urllib.parse import urlencode
import random
import string
import os
import requests as http_requests
from datetime import timedelta

from .models import User, Shop, PaymentMethod
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    PaymentInfoSerializer, PrefixSerializer, ShopSerializer,
    BusinessSettingsSerializer, OrderSettingsSerializer, InvoiceSettingsSerializer,
    PaymentMethodSerializer, ChangePasswordSerializer, TwoFactorToggleSerializer,
    OTPVerifySerializer
)


class RegisterView(generics.CreateAPIView):
    """User registration view"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    @swagger_auto_schema(
        operation_description="Register a new user account",
        responses={
            201: openapi.Response('User created successfully', UserSerializer),
            400: 'Bad Request'
        },
        tags=['Authentication']
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


@swagger_auto_schema(
    method='post',
    operation_description="Login with email and password to get authentication token",
    request_body=LoginSerializer,
    responses={
        200: openapi.Response('Login successful', openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'token': openapi.Schema(type=openapi.TYPE_STRING),
                'user': openapi.Schema(type=openapi.TYPE_OBJECT),
                'requires_2fa': openapi.Schema(type=openapi.TYPE_BOOLEAN)
            }
        )),
        400: 'Invalid credentials'
    },
    tags=['Authentication']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """User login view - checks for 2FA"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Check if 2FA is enabled
        if user.is_2fa_enabled:
            # Generate and send OTP
            otp = generate_otp()
            user.otp_code = otp
            user.otp_expires_at = timezone.now() + timedelta(minutes=10)
            user.save()
            
            if send_otp_email(user, otp):
                return Response({
                    'requires_2fa': True,
                    'message': 'OTP sent to your email. Please verify to complete login.',
                    'email': user.email
                })
            else:
                return Response({
                    'error': 'Failed to send OTP. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # No 2FA, login directly
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
                'requires_2fa': False
            })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='post',
    operation_description="Logout and invalidate authentication token",
    responses={
        200: openapi.Response('Logout successful', openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'message': openapi.Schema(type=openapi.TYPE_STRING)
            }
        ))
    },
    tags=['Authentication']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """User logout view"""
    try:
        request.user.auth_token.delete()
    except:
        pass
    return Response({'message': 'Logged out successfully'})


@swagger_auto_schema(
    method='get',
    operation_description="Get payment information",
    responses={200: PaymentInfoSerializer},
    tags=['Settings']
)
@swagger_auto_schema(
    method='post',
    operation_description="Update payment information",
    request_body=PaymentInfoSerializer,
    responses={200: 'Payment information updated successfully'},
    tags=['Settings']
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payment_info_view(request):
    """Get or update payment information"""
    if request.method == 'GET':
        return Response({
            'bank_name': request.user.bank_name or '',
            'branch_name': request.user.branch_name or '',
            'account_name': request.user.account_name or '',
            'account_number': request.user.account_number or '',
            'ifsc_code': request.user.ifsc_code or '',
            'gpay_phonepe': request.user.gpay_phonepe or ''
        })
    else:
        serializer = PaymentInfoSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            user.bank_name = serializer.validated_data.get('bank_name', '')
            user.branch_name = serializer.validated_data.get('branch_name', '')
            user.account_name = serializer.validated_data.get('account_name', '')
            user.account_number = serializer.validated_data.get('account_number', '')
            user.ifsc_code = serializer.validated_data.get('ifsc_code', '')
            user.gpay_phonepe = serializer.validated_data.get('gpay_phonepe', '')
            user.save()
            return Response({'message': 'Payment information updated successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='post',
    operation_description="Update document number prefixes (quotation and invoice)",
    request_body=PrefixSerializer,
    responses={200: 'Prefixes updated successfully'},
    tags=['Settings']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_prefixes_view(request):
    """Update document number prefixes"""
    serializer = PrefixSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        user.quotation_prefix = serializer.validated_data['quotation_prefix']
        user.invoice_prefix = serializer.validated_data['invoice_prefix']
        user.save()
        return Response({'message': 'Prefixes updated successfully'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def get_or_create_shop(user):
    """Helper function to get or create shop for a user"""
    if not user.shop:
        shop = Shop.objects.create(shop_name=f"{user.name}'s Shop")
        user.shop = shop
        user.save()
        # Create default payment methods
        PaymentMethod.objects.create(shop=shop, name='Cash')
        PaymentMethod.objects.create(shop=shop, name='UPI')
    return user.shop


# ============== Business Settings ==============

@swagger_auto_schema(
    method='get',
    operation_description="Get business settings",
    responses={200: BusinessSettingsSerializer},
    tags=['Settings']
)
@swagger_auto_schema(
    method='post',
    operation_description="Update business settings",
    request_body=BusinessSettingsSerializer,
    responses={200: BusinessSettingsSerializer},
    tags=['Settings']
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def business_settings_view(request):
    """Get or update business settings"""
    shop = get_or_create_shop(request.user)
    
    if request.method == 'GET':
        serializer = BusinessSettingsSerializer(shop, context={'request': request})
        return Response(serializer.data)
    else:
        serializer = BusinessSettingsSerializer(shop, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============== Order Settings ==============

@swagger_auto_schema(
    method='get',
    operation_description="Get order settings",
    responses={200: OrderSettingsSerializer},
    tags=['Settings']
)
@swagger_auto_schema(
    method='post',
    operation_description="Update order settings",
    request_body=OrderSettingsSerializer,
    responses={200: OrderSettingsSerializer},
    tags=['Settings']
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def order_settings_view(request):
    """Get or update order settings"""
    shop = get_or_create_shop(request.user)
    
    if request.method == 'GET':
        serializer = OrderSettingsSerializer(shop)
        return Response(serializer.data)
    else:
        serializer = OrderSettingsSerializer(shop, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============== Invoice Settings ==============

@swagger_auto_schema(
    method='get',
    operation_description="Get invoice settings",
    responses={200: InvoiceSettingsSerializer},
    tags=['Settings']
)
@swagger_auto_schema(
    method='post',
    operation_description="Update invoice settings",
    request_body=InvoiceSettingsSerializer,
    responses={200: InvoiceSettingsSerializer},
    tags=['Settings']
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def invoice_settings_view(request):
    """Get or update invoice settings"""
    shop = get_or_create_shop(request.user)
    
    if request.method == 'GET':
        serializer = InvoiceSettingsSerializer(shop)
        return Response(serializer.data)
    else:
        serializer = InvoiceSettingsSerializer(shop, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============== Payment Methods ==============

@swagger_auto_schema(
    method='get',
    operation_description="Get all payment methods",
    responses={200: PaymentMethodSerializer(many=True)},
    tags=['Settings']
)
@swagger_auto_schema(
    method='post',
    operation_description="Create a new payment method",
    request_body=PaymentMethodSerializer,
    responses={201: PaymentMethodSerializer},
    tags=['Settings']
)
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payment_methods_view(request):
    """Get all or create payment method"""
    shop = get_or_create_shop(request.user)
    
    if request.method == 'GET':
        methods = PaymentMethod.objects.filter(shop=shop)
        serializer = PaymentMethodSerializer(methods, many=True)
        return Response(serializer.data)
    else:
        serializer = PaymentMethodSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(shop=shop)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='put',
    operation_description="Update a payment method",
    request_body=PaymentMethodSerializer,
    responses={200: PaymentMethodSerializer},
    tags=['Settings']
)
@swagger_auto_schema(
    method='delete',
    operation_description="Delete a payment method",
    responses={204: 'Payment method deleted'},
    tags=['Settings']
)
@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def payment_method_detail_view(request, pk):
    """Update or delete a payment method"""
    shop = get_or_create_shop(request.user)
    
    try:
        method = PaymentMethod.objects.get(pk=pk, shop=shop)
    except PaymentMethod.DoesNotExist:
        return Response({'error': 'Payment method not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'PUT':
        serializer = PaymentMethodSerializer(method, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    else:
        method.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============== Security Settings ==============

@swagger_auto_schema(
    method='post',
    operation_description="Change user password",
    request_body=ChangePasswordSerializer,
    responses={200: 'Password changed successfully'},
    tags=['Security']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """Change user password"""
    serializer = ChangePasswordSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        if not user.check_password(serializer.validated_data['current_password']):
            return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))


def send_otp_email(user, otp):
    """Send OTP to user's email"""
    subject = 'Your 2FA Verification Code'
    message = f'Your verification code is: {otp}\n\nThis code will expire in 10 minutes.'
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@boutique.com',
            [user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        return False


@swagger_auto_schema(
    method='post',
    operation_description="Toggle 2FA on/off. If enabling, sends OTP to email for verification.",
    request_body=TwoFactorToggleSerializer,
    responses={200: 'OTP sent / 2FA disabled'},
    tags=['Security']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_2fa_view(request):
    """Toggle 2FA for user"""
    serializer = TwoFactorToggleSerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        enable = serializer.validated_data['enable']
        
        if enable:
            # Generate and send OTP
            otp = generate_otp()
            user.otp_code = otp
            user.otp_expires_at = timezone.now() + timedelta(minutes=10)
            user.save()
            
            if send_otp_email(user, otp):
                return Response({'message': 'OTP sent to your email. Please verify to enable 2FA.'})
            else:
                return Response({'error': 'Failed to send OTP. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Disable 2FA
            user.is_2fa_enabled = False
            user.otp_code = None
            user.otp_expires_at = None
            user.save()
            return Response({'message': '2FA has been disabled.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='post',
    operation_description="Verify OTP to enable 2FA",
    request_body=OTPVerifySerializer,
    responses={200: '2FA enabled successfully'},
    tags=['Security']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_2fa_otp_view(request):
    """Verify OTP to enable 2FA"""
    serializer = OTPVerifySerializer(data=request.data)
    if serializer.is_valid():
        user = request.user
        otp = serializer.validated_data['otp']
        
        if not user.otp_code or not user.otp_expires_at:
            return Response({'error': 'No OTP request found. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if timezone.now() > user.otp_expires_at:
            return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if user.otp_code != otp:
            return Response({'error': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Enable 2FA
        user.is_2fa_enabled = True
        user.otp_code = None
        user.otp_expires_at = None
        user.save()
        return Response({'message': '2FA has been enabled successfully.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@swagger_auto_schema(
    method='post',
    operation_description="Send OTP for login verification (when 2FA is enabled)",
    responses={200: 'OTP sent to email'},
    tags=['Security']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def send_login_otp_view(request):
    """Send OTP for login verification"""
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not user.is_2fa_enabled:
        return Response({'error': '2FA is not enabled for this user'}, status=status.HTTP_400_BAD_REQUEST)
    
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = timezone.now() + timedelta(minutes=10)
    user.save()
    
    if send_otp_email(user, otp):
        return Response({'message': 'OTP sent to your email.'})
    else:
        return Response({'error': 'Failed to send OTP. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_description="Verify login OTP (when 2FA is enabled)",
    responses={200: 'Login successful with token'},
    tags=['Security']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_login_otp_view(request):
    """Verify login OTP and return token"""
    email = request.data.get('email')
    otp = request.data.get('otp')
    
    if not email or not otp:
        return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not user.otp_code or not user.otp_expires_at:
        return Response({'error': 'No OTP request found. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if timezone.now() > user.otp_expires_at:
        return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if user.otp_code != otp:
        return Response({'error': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Clear OTP and return token
    user.otp_code = None
    user.otp_expires_at = None
    user.save()
    
    token, created = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': UserSerializer(user).data
    })


# ============== Get Full Shop Settings ==============

@swagger_auto_schema(
    method='get',
    operation_description="Get all shop settings",
    responses={200: ShopSerializer},
    tags=['Settings']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_settings_view(request):
    """Get all shop settings at once"""
    shop = get_or_create_shop(request.user)
    serializer = ShopSerializer(shop, context={'request': request})
    return Response(serializer.data)


# ============== Forgot Password ==============

@swagger_auto_schema(
    method='post',
    operation_description="Request password reset OTP",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={'email': openapi.Schema(type=openapi.TYPE_STRING)},
        required=['email']
    ),
    responses={200: 'OTP sent to email'},
    tags=['Authentication']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    """Send OTP for password reset"""
    email = request.data.get('email')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't reveal if email exists or not
        return Response({'message': 'If an account with this email exists, an OTP has been sent.'})
    
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = timezone.now() + timedelta(minutes=10)
    user.save()
    
    if send_otp_email(user, otp):
        return Response({'message': 'OTP sent to your email.'})
    else:
        return Response({'error': 'Failed to send OTP.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_description="Reset password with OTP verification",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'email': openapi.Schema(type=openapi.TYPE_STRING),
            'otp': openapi.Schema(type=openapi.TYPE_STRING),
            'new_password': openapi.Schema(type=openapi.TYPE_STRING)
        },
        required=['email', 'otp', 'new_password']
    ),
    responses={200: 'Password reset successful'},
    tags=['Authentication']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    """Reset password with OTP"""
    email = request.data.get('email')
    otp = request.data.get('otp')
    new_password = request.data.get('new_password')
    
    if not all([email, otp, new_password]):
        return Response({'error': 'Email, OTP, and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(new_password) < 6:
        return Response({'error': 'Password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not user.otp_code or not user.otp_expires_at:
        return Response({'error': 'No OTP request found. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if timezone.now() > user.otp_expires_at:
        return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
    
    if user.otp_code != otp:
        return Response({'error': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Reset password
    user.set_password(new_password)
    user.otp_code = None
    user.otp_expires_at = None
    user.save()
    
    return Response({'message': 'Password has been reset successfully.'})


# ============== Google OAuth ==============

@api_view(['GET'])
@permission_classes([AllowAny])
def google_login_view(request):
    """Redirect to Google OAuth consent screen"""
    google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
    redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI')

    if not google_client_id or not redirect_uri:
        return Response({'error': 'Google OAuth not configured'},
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Get action (login or signup) from query params
    action = request.GET.get('action', 'login')

    params = {
        'client_id': google_client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
        'prompt': 'consent',
        'state': action  # Pass action as state parameter
    }

    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return redirect(google_auth_url)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback_view(request):
    """
    Handle Google OAuth callback.
    Exchange code for token, verify, create/login user.
    """
    code = request.GET.get('code')
    error = request.GET.get('error')
    action = request.GET.get('state', 'login')  # Get action from state parameter

    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    if error:
        return redirect(f"{frontend_url}/auth/google/callback?error={error}")

    if not code:
        return redirect(f"{frontend_url}/auth/google/callback?error=missing_code")

    try:
        # Exchange code for tokens
        token_url = 'https://oauth2.googleapis.com/token'
        token_data = {
            'code': code,
            'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
            'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
            'redirect_uri': os.environ.get('GOOGLE_REDIRECT_URI'),
            'grant_type': 'authorization_code'
        }

        token_response = http_requests.post(token_url, data=token_data)
        token_response.raise_for_status()
        tokens = token_response.json()

        # Verify ID token using Google's tokeninfo endpoint
        id_token = tokens.get('id_token')
        if not id_token:
            return redirect(f"{frontend_url}/auth/google/callback?error=no_id_token")

        # Verify the ID token
        verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        verify_response = http_requests.get(verify_url)
        verify_response.raise_for_status()
        id_info = verify_response.json()

        # Extract user info
        email = id_info.get('email')
        name = id_info.get('name', '')

        if not email:
            return redirect(f"{frontend_url}/auth/google/callback?error=email_not_provided")

        # Check if user exists
        user_exists = User.objects.filter(email=email).exists()

        if action == 'login' and not user_exists:
            # User trying to login but doesn't have an account - redirect to signup
            return redirect(f"{frontend_url}/signup?error=no_account&email={email}")

        if user_exists:
            user = User.objects.get(email=email)
        else:
            # Create new user (only for signup action)
            user = User.objects.create_user(
                email=email,
                name=name or email.split('@')[0],
                password=None  # No password for OAuth users
            )

        # Generate or get token
        token, created = Token.objects.get_or_create(user=user)

        # Redirect to frontend with token
        return redirect(f"{frontend_url}/auth/google/callback?token={token.key}")

    except Exception as e:
        print(f"Google OAuth error: {e}")
        return redirect(f"{frontend_url}/auth/google/callback?error=authentication_failed")


@swagger_auto_schema(
    method='get',
    operation_description="Get current authenticated user information",
    responses={200: UserSerializer},
    tags=['Authentication']
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Get current authenticated user"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
