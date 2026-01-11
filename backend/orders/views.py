from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from subscriptions.permissions import ReadOnlyIfExpired

from .models import Order
from .serializers import OrderSerializer, OrderCreateSerializer, OrderUpdateSerializer
from customers.models import Customer


class OrderViewSet(viewsets.ModelViewSet):
    """Order viewset"""
    permission_classes = [IsAuthenticated, ReadOnlyIfExpired]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return OrderUpdateSerializer
        return OrderSerializer
    
    def get_queryset(self):
        queryset = Order.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).order_by('-created_at')
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by customer if provided
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user, created_by=self.request.user)
    
    def perform_destroy(self, instance):
        """Soft delete"""
        instance.is_deleted = True
        instance.save()
    
    @swagger_auto_schema(tags=['Orders'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Orders'])
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Orders'])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Orders'])
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Orders'])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    
    @swagger_auto_schema(
        method='patch',
        operation_description="Update order status",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'status': openapi.Schema(type=openapi.TYPE_STRING, enum=['PENDING', 'IN_STITCHING', 'READY', 'DELIVERED'])
            }
        ),
        tags=['Orders']
    )
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update order status"""
        order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Order.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent backward transitions (unless admin)
        status_order = ['PENDING', 'IN_STITCHING', 'READY', 'DELIVERED']
        current_index = status_order.index(order.status)
        new_index = status_order.index(new_status)
        
        if new_index < current_index and not request.user.is_staff:
            return Response(
                {'error': 'Cannot move order to previous status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = new_status
        order.save()
        
        return Response(OrderSerializer(order).data)
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get dashboard statistics including customer count, pending orders, revenue, alerts, and trends",
        tags=['Dashboard']
    )
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics for current user"""
        today = timezone.now().date()
        this_month_start = today.replace(day=1)
        
        # Total customers
        total_customers = Customer.objects.filter(user=request.user).count()
        
        # Pending orders (PENDING or IN_STITCHING)
        pending_orders = Order.objects.filter(
            user=request.user,
            is_deleted=False,
            status__in=['PENDING', 'IN_STITCHING']
        ).count()
        
        # Monthly revenue
        monthly_revenue = Order.objects.filter(
            user=request.user,
            is_deleted=False,
            order_date__gte=this_month_start
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Unpaid invoices (orders with unpaid or partial payment)
        unpaid_invoices = Order.objects.filter(
            user=request.user,
            is_deleted=False,
            payment_status__in=['UNPAID', 'PARTIAL']
        ).count()
        
        # Overdue orders (delivery_date < today and status != DELIVERED)
        overdue_orders = Order.objects.filter(
            user=request.user,
            is_deleted=False,
            delivery_date__lt=today,
            status__in=['PENDING', 'IN_STITCHING', 'READY']
        ).count()
        
        # Orders due this week
        week_end = today + timedelta(days=7)
        orders_due_week = Order.objects.filter(
            user=request.user,
            is_deleted=False,
            delivery_date__gte=today,
            delivery_date__lte=week_end,
            status__in=['PENDING', 'IN_STITCHING', 'READY']
        ).count()
        
        # Recent orders (last 10)
        recent_orders = Order.objects.filter(
            user=request.user,
            is_deleted=False
        ).order_by('-created_at')[:10]
        
        # Monthly revenue trend (last 6 months)
        revenue_trend = []
        for i in range(5, -1, -1):
            month_start = (today.replace(day=1) - relativedelta(months=i))
            month_end = month_start + relativedelta(months=1)
            
            revenue = Order.objects.filter(
                user=request.user,
                is_deleted=False,
                order_date__gte=month_start,
                order_date__lt=month_end
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            revenue_trend.append({
                'month': month_start.strftime('%b'),
                'revenue': float(revenue)
            })
        
        # Payment status breakdown
        payment_breakdown = {
            'paid': Order.objects.filter(
                user=request.user,
                is_deleted=False,
                payment_status='PAID'
            ).count(),
            'partial': Order.objects.filter(
                user=request.user,
                is_deleted=False,
                payment_status='PARTIAL'
            ).count(),
            'unpaid': Order.objects.filter(
                user=request.user,
                is_deleted=False,
                payment_status='UNPAID'
            ).count(),
        }
        
        stats = {
            'total_customers': total_customers,
            'pending_orders': pending_orders,
            'monthly_revenue': float(monthly_revenue),
            'unpaid_invoices': unpaid_invoices,
            'overdue_orders': overdue_orders,
            'orders_due_week': orders_due_week,
            'recent_orders': OrderSerializer(recent_orders, many=True).data,
            'revenue_trend': revenue_trend,
            'payment_breakdown': payment_breakdown,
        }
        
        return Response(stats)
