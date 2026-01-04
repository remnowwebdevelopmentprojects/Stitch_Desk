from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, FileResponse
from django.utils import timezone
from datetime import datetime, timedelta
from io import BytesIO
import os
import re
import zipfile
import tempfile
import shutil
import urllib.parse
import traceback
from html import escape
from weasyprint import HTML, CSS
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.authentication import TokenAuthentication

from .models import User, Quotation, Item, Customer, Measurement, Order, OrderItem, MeasurementTemplate
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    ItemSerializer, QuotationSerializer, PaymentInfoSerializer, PrefixSerializer,
    CustomerSerializer, MeasurementSerializer, MeasurementTemplateSerializer,
    OrderSerializer, OrderItemSerializer, OrderCreateSerializer
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
                'user': openapi.Schema(type=openapi.TYPE_OBJECT)
            }
        )),
        400: 'Invalid credentials'
    },
    tags=['Authentication']
)
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """User login view"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
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


class ItemViewSet(viewsets.ModelViewSet):
    """Item viewset"""
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Item.objects.filter(user=self.request.user).order_by('description')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CustomerViewSet(viewsets.ModelViewSet):
    """Customer viewset"""
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Customer.objects.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @swagger_auto_schema(tags=['Customers'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Customers'])
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Customers'])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Customers'])
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Customers'])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class QuotationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing quotations and invoices.
    
    Supports creating, updating, and managing quotations/invoices with GST calculations.
    """
    serializer_class = QuotationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Quotation.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        quotation = serializer.save(user=self.request.user)
        # Generate share token
        quotation.generate_share_token()
    
    @swagger_auto_schema(tags=['Quotations'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Quotations'])
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Quotations'])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Quotations'])
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)
    
    @swagger_auto_schema(tags=['Quotations'])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Void an invoice. Only invoices can be voided.",
        responses={
            200: openapi.Response('Invoice voided successfully'),
            400: 'Bad Request - Only invoices can be voided or invoice already voided'
        },
        tags=['Quotations']
    )
    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        """Void an invoice"""
        quotation = self.get_object()
        
        if quotation.document_type != 'invoice':
            return Response(
                {'error': 'Only invoices can be voided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if quotation.voided:
            return Response(
                {'error': 'Invoice is already voided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        quotation.voided = True
        quotation.save()
        
        return Response({'message': 'Invoice voided successfully'})
    
    @swagger_auto_schema(
        operation_description="Generate and download PDF for quotation/invoice",
        responses={
            200: openapi.Response('PDF file', schema=openapi.Schema(type=openapi.TYPE_FILE)),
            500: 'PDF generation failed'
        },
        tags=['Quotations']
    )
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for quotation/invoice"""
        quotation = self.get_object()
        
        try:
            pdf_content = self._generate_pdf_content(quotation, is_shared=False)
            
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{quotation.quotation_no}.pdf"'
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e), 'traceback': traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @swagger_auto_schema(
        operation_description="Generate WhatsApp share link for quotation/invoice",
        responses={
            200: openapi.Response('WhatsApp share link generated', openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'whatsapp_url': openapi.Schema(type=openapi.TYPE_STRING),
                    'message': openapi.Schema(type=openapi.TYPE_STRING),
                    'pdf_url': openapi.Schema(type=openapi.TYPE_STRING),
                    'token': openapi.Schema(type=openapi.TYPE_STRING)
                }
            )),
            400: 'Cannot share voided invoices'
        },
        tags=['Quotations']
    )
    @action(detail=True, methods=['get'])
    def whatsapp(self, request, pk=None):
        """Generate WhatsApp share link"""
        quotation = self.get_object()
        
        # Block voided invoices from being shared
        if quotation.document_type == 'invoice' and quotation.voided:
            return Response(
                {'error': 'Cannot share voided invoices'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure token exists
        if not quotation.share_token:
            quotation.generate_share_token()
        
        # Generate PDF URL using token
        pdf_url = request.build_absolute_uri(f'/api/d/{quotation.share_token}/')
        
        # Create WhatsApp message
        doc_type = 'Quotation' if quotation.document_type == 'quotation' else 'Invoice'
        message = f"Hi! Please find your {doc_type} from the below: {pdf_url}"
        
        # URL encode the message for WhatsApp
        encoded_message = urllib.parse.quote(message)
        
        # Return the WhatsApp URL
        whatsapp_url = f"https://wa.me/?text={encoded_message}"
        
        return Response({
            'whatsapp_url': whatsapp_url,
            'message': message,
            'pdf_url': pdf_url,
            'token': quotation.share_token
        })
    
    def _generate_pdf_content(self, quotation, is_shared=False):
        """Generate PDF content for a quotation/invoice"""
        formatted_date = quotation.date.strftime('%d-%b-%Y')
        
        address_lines = [line.strip() for line in quotation.to_address.split('\n') if line.strip()]
        if len(address_lines) > 0:
            company_name = address_lines[0]
            address_rest = '<br>'.join(address_lines[1:]) if len(address_lines) > 1 else ''
        else:
            company_name = quotation.to_address
            address_rest = ''
        
        is_quotation = quotation.document_type == 'quotation'
        doc_title = 'QUOTATION' if is_quotation else 'INVOICE'
        doc_label = 'Quotation' if is_quotation else 'Invoice'
        
        items_html = ''
        for index, item in enumerate(quotation.items, start=1):
            description = escape(item.get('description', ''))
            hsn_code = escape(item.get('hsn_code', '')) or ''
            month = escape(item.get('month', '')) or ''
            rate = escape(item.get('rate', '')) or ''
            amount = item.get('amount', '')
            
            month_display = month.replace(' ', '<br>') if month else ''
            
            if quotation.currency == 'USD':
                amount_display = f'${amount}' if amount else '$0.00'
            elif quotation.currency == 'INR':
                amount_display = f'₹{amount}' if amount else '₹0.00'
            else:
                amount_display = f'{quotation.currency} {amount}' if amount else f'{quotation.currency} 0.00'
            
            items_html += f'''                        <tr>
                            <td>
                                <p class="item-description">{index}. {description}</p>
                            </td>
                            <td class="text-center">{hsn_code}</td>
                            <td class="text-center">{month_display}</td>
                            <td class="text-center">{rate}</td>
                            <td class="text-right">{amount_display}</td>
                        </tr>
'''
        
        # Use stored sub_total and gst_amount when available
        base_amount = float(quotation.sub_total) if quotation.sub_total is not None else float(quotation.total_amount)
        stored_gst_amount = float(quotation.gst_amount) if quotation.gst_amount is not None else 0.0
        total_amount = base_amount + stored_gst_amount

        if quotation.currency == 'USD':
            subtotal_display = f'${base_amount:.2f}'
            total_display = f'${total_amount:.2f}'
            currency_text = 'In Dollars'
        elif quotation.currency == 'INR':
            subtotal_display = f'₹{base_amount:.2f}'
            total_display = f'₹{total_amount:.2f}'
            currency_text = 'In Rupees'
        else:
            subtotal_display = f'{quotation.currency} {base_amount:.2f}'
            total_display = f'{quotation.currency} {total_amount:.2f}'
            currency_text = f'In {quotation.currency}'
        
        # Calculate GST rows if currency is INR
        final_total = total_amount
        if quotation.currency == 'INR' and quotation.gst_type:
            items_html += f'''                        <tr class="total-row-subtotal">
                            <td colspan="3"></td>
                            <td class="text-center" style="border-top: 2px solid #000; font-weight: 700;">Sub Total</td>
                            <td class="text-right" style="border-top: 2px solid #000; font-weight: 700;">{subtotal_display}</td>
                        </tr>
'''
            
            if quotation.gst_type == 'intrastate' and quotation.cgst_rate and quotation.sgst_rate:
                cgst_amount = base_amount * float(quotation.cgst_rate) / 100
                sgst_amount = base_amount * float(quotation.sgst_rate) / 100
                final_total = base_amount + cgst_amount + sgst_amount
                
                cgst_display = f'₹{cgst_amount:.2f}'
                sgst_display = f'₹{sgst_amount:.2f}'
                final_display = f'₹{final_total:.2f}'
                
                items_html += f'''                        <tr>
                            <td colspan="3"></td>
                            <td class="text-center" style="font-weight: 600;">CGST ({quotation.cgst_rate}%)</td>
                            <td class="text-right" style="font-weight: 600;">{cgst_display}</td>
                        </tr>
                        <tr>
                            <td colspan="3"></td>
                            <td class="text-center" style="font-weight: 600;">SGST ({quotation.sgst_rate}%)</td>
                            <td class="text-right" style="font-weight: 600;">{sgst_display}</td>
                        </tr>
'''
            elif quotation.gst_type == 'interstate' and quotation.igst_rate:
                igst_amount = base_amount * float(quotation.igst_rate) / 100
                final_total = base_amount + igst_amount
                
                igst_display = f'₹{igst_amount:.2f}'
                final_display = f'₹{final_total:.2f}'
                
                items_html += f'''                        <tr>
                            <td colspan="3"></td>
                            <td class="text-center" style="font-weight: 600;">IGST ({quotation.igst_rate}%)</td>
                            <td class="text-right" style="font-weight: 600;">{igst_display}</td>
                        </tr>
'''
            
            items_html += f'''                        <tr>
                            <td colspan="5" style="padding: 0; border: none;"></td>
                        </tr>
                        <tr class="total-row-final">
                            <td style="font-weight: 700; font-size: 14px;">Total ({currency_text})</td>
                            <td class="text-center"></td>
                            <td class="text-center"></td>
                            <td class="text-center"></td>
                            <td class="text-right" style="font-weight: 700; font-size: 14px;">{final_display}</td>
                        </tr>
'''
        else:
            items_html += f'''                        <tr class="total-row-subtotal">
                            <td colspan="3"></td>
                            <td class="text-center" style="border-top: 2px solid #000; font-weight: 700;">Sub Total</td>
                            <td class="text-right" style="border-top: 2px solid #000; font-weight: 700;">{total_display}</td>
                        </tr>
                        <tr>
                            <td colspan="5" style="padding: 0; border: none;"></td>
                        </tr>
                        <tr class="total-row-final">
                            <td style="font-weight: 700; font-size: 14px;">Total ({currency_text})</td>
                            <td class="text-center"></td>
                            <td class="text-center"></td>
                            <td class="text-center"></td>
                            <td class="text-right" style="font-weight: 700; font-size: 14px;">{total_display}</td>
                        </tr>
'''
        
        # Load template
        from django.conf import settings
        template_dir = os.path.join(settings.BASE_DIR, 'templates', 'layout')
        template_file = os.path.join(template_dir, 'quotation.html' if is_quotation else 'index.html')
        
        # If template doesn't exist, use a fallback
        if not os.path.exists(template_file):
            # Use a basic HTML template
            html_content = self._get_basic_template(doc_title, doc_label, company_name, address_rest, 
                                                     quotation.quotation_no, formatted_date, items_html, quotation)
        else:
            with open(template_file, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            if not is_quotation:
                html_content = re.sub(r'<h2 class="invoice-title">INVOICE</h2>',
                                     f'<h2 class="invoice-title">{doc_title}</h2>',
                                     html_template)
            else:
                html_content = html_template
            
            if not is_quotation:
                html_content = re.sub(r'<span class="invoice-label">Invoice No:</span>',
                                     f'<span class="invoice-label">{doc_label} No:</span>',
                                     html_content)
            
            html_content = re.sub(r'<h3 class="client-name"></h3>',
                                 f'<h3 class="client-name">{escape(company_name)}</h3>',
                                 html_content)
            html_content = html_content.replace('<p class="client-address"></p>',
                                              f'<p class="client-address">{address_rest}</p>')
            
            details_pattern = r'(<div class="invoice-details">.*?<span class="invoice-label">' + doc_label + r' No:</span>\s*<span class="invoice-value">)(</span>.*?<span class="invoice-label">Date:</span>\s*<span class="invoice-value">)(</span>)'
            html_content = re.sub(details_pattern,
                                 f'\\g<1>{escape(quotation.quotation_no)}\\g<2>{formatted_date}\\g<3>',
                                 html_content,
                                 flags=re.DOTALL)
            
            # Update currency symbol in table header
            if quotation.currency == 'USD':
                currency_label = 'Amount ($)'
            elif quotation.currency == 'INR':
                currency_label = 'Amount (Rs)'
            elif quotation.currency == 'EUR':
                currency_label = 'Amount (€)'
            elif quotation.currency == 'GBP':
                currency_label = 'Amount (£)'
            else:
                currency_label = f'Amount ({quotation.currency})'
            
            html_content = re.sub(r'<th class="text-right"[^>]*>Amount \([^)]+\)</th>',
                                 f'<th class="text-right" style="width: 15%;">{currency_label}</th>',
                                 html_content)
            
            # Insert all items into the table
            items_pattern = r'(<tbody>\s*)<!--.*?-->(\s*</tbody>)'
            html_content = re.sub(items_pattern,
                                 f'\\1\n{items_html}                    \\2',
                                 html_content,
                                 flags=re.DOTALL)
            
            if not is_quotation:
                html_content = re.sub(r'(<div><span class="payment-label">Bank Name:</span> <span class="payment-value">)</span></div>',
                                     f'\\1{escape(quotation.bank_name or "")}</span></div>',
                                     html_content)
                html_content = re.sub(r'(<div><span class="payment-label">Branch:</span> <span class="payment-value">)</span></div>',
                                     f'\\1{escape(quotation.branch_name or "")}</span></div>',
                                     html_content)
                html_content = re.sub(r'(<div><span class="payment-label">Account Name:</span> <span class="payment-value">)</span></div>',
                                     f'\\1{escape(quotation.account_name or "")}</span></div>',
                                     html_content)
                account_no_value = ""
                if quotation.account_number:
                    clean_account = str(quotation.account_number).strip()
                    if clean_account.lower().startswith('w'):
                        clean_account = clean_account[1:]
                    account_no_value = escape(clean_account.strip())
                html_content = html_content.replace(
                    '<span class="payment-label">Account No:</span> <span class="payment-value mono"></span>',
                    f'<span class="payment-label">Account No:</span> <span class="payment-value mono">{account_no_value}</span>'
                )
                
                html_content = re.sub(r'(<div><span class="payment-label">IFSC Code:</span> <span class="payment-value">)</span></div>',
                                     f'\\1{escape(quotation.ifsc_code or "")}</span></div>',
                                     html_content)
                
                gpay_value = ""
                if quotation.gpay_phonepe:
                    gpay_value = escape(str(quotation.gpay_phonepe).strip())
                
                html_content = html_content.replace(
                    '<span class="payment-label">Gpay / PhonePe:</span> <span class="payment-value" style="font-weight: 600;"></span>',
                    f'<span class="payment-label">Gpay / PhonePe:</span> <span class="payment-value" style="font-weight: 600;">{gpay_value}</span>'
                )
        
        from django.conf import settings
        base_dir = str(settings.BASE_DIR)
        
        # WeasyPrint needs file:// URLs for local assets
        assets_path = os.path.join(base_dir, 'assets').replace('\\', '/')
        html_content = html_content.replace('src="assets/', f'src="file:///{assets_path}/')
        
        # Create WeasyPrint HTML object
        html_doc = HTML(string=html_content, base_url=base_dir)
        
        # Define page CSS for A4 with no margins
        page_css = CSS(string='''
            @page {
                size: A4;
                margin: 0;
            }
        ''')
        
        # Generate PDF
        pdf_content = html_doc.write_pdf(stylesheets=[page_css])
        return pdf_content
    
    def _get_basic_template(self, doc_title, doc_label, company_name, address_rest, 
                           quotation_no, formatted_date, items_html, quotation):
        """Fallback basic HTML template if templates are not available"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{doc_title}</title>
        </head>
        <body>
            <h2>{doc_title}</h2>
            <div>
                <span>{doc_label} No:</span> <span>{quotation_no}</span>
                <span>Date:</span> <span>{formatted_date}</span>
            </div>
            <h3>{company_name}</h3>
            <p>{address_rest}</p>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>HSN Code</th>
                        <th>Month</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
        </body>
        </html>
        """


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


@swagger_auto_schema(
    method='post',
    operation_description="Get count of documents in specified date range",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['from_date', 'to_date'],
        properties={
            'from_date': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE),
            'to_date': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE),
            'include_quotations': openapi.Schema(type=openapi.TYPE_BOOLEAN, default=True),
            'include_invoices': openapi.Schema(type=openapi.TYPE_BOOLEAN, default=True),
            'payment_status': openapi.Schema(type=openapi.TYPE_STRING, enum=['all', 'paid', 'unpaid'], default='all')
        }
    ),
    responses={
        200: openapi.Response('Document counts', openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'total_documents': openapi.Schema(type=openapi.TYPE_INTEGER),
                'quotations': openapi.Schema(type=openapi.TYPE_INTEGER),
                'invoices': openapi.Schema(type=openapi.TYPE_INTEGER)
            }
        ))
    },
    tags=['Bulk Operations']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_export_count_view(request):
    """Get the count of documents in the specified date range"""
    try:
        from_date = datetime.strptime(request.data['from_date'], '%Y-%m-%d').date()
        to_date = datetime.strptime(request.data['to_date'], '%Y-%m-%d').date()
        include_quotations = request.data.get('include_quotations', True)
        include_invoices = request.data.get('include_invoices', True)
        payment_status = request.data.get('payment_status', 'all')
        
        documents = Quotation.objects.filter(
            user=request.user,
            created_at__gte=from_date,
            created_at__lte=datetime.combine(to_date, datetime.max.time())
        )
        
        total_count = 0
        quotations_count = 0
        invoices_count = 0
        
        for doc in documents:
            doc_type = doc.document_type.lower()
            if doc_type == 'invoice' and doc.voided:
                continue
            
            if doc_type == 'quotation' and include_quotations:
                total_count += 1
                quotations_count += 1
            elif doc_type == 'invoice' and include_invoices:
                if payment_status == 'all':
                    total_count += 1
                    invoices_count += 1
                elif payment_status == 'paid' and doc.payment_status == 'paid':
                    total_count += 1
                    invoices_count += 1
                elif payment_status == 'unpaid' and doc.payment_status != 'paid':
                    total_count += 1
                    invoices_count += 1
        
        return Response({
            'total_documents': total_count,
            'quotations': quotations_count,
            'invoices': invoices_count
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='post',
    operation_description="Export multiple quotations/invoices as ZIP file",
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        required=['from_date', 'to_date'],
        properties={
            'from_date': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE),
            'to_date': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE),
            'include_quotations': openapi.Schema(type=openapi.TYPE_BOOLEAN, default=True),
            'include_invoices': openapi.Schema(type=openapi.TYPE_BOOLEAN, default=True),
            'payment_status': openapi.Schema(type=openapi.TYPE_STRING, enum=['all', 'paid', 'unpaid'], default='all')
        }
    ),
    responses={
        200: openapi.Response('ZIP file', schema=openapi.Schema(type=openapi.TYPE_FILE)),
        404: 'No documents found in the specified date range'
    },
    tags=['Bulk Operations']
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_export_view(request):
    """Bulk export quotations/invoices as ZIP"""
    try:
        from_date = datetime.strptime(request.data['from_date'], '%Y-%m-%d').date()
        to_date = datetime.strptime(request.data['to_date'], '%Y-%m-%d').date()
        include_quotations = request.data.get('include_quotations', True)
        include_invoices = request.data.get('include_invoices', True)
        payment_status = request.data.get('payment_status', 'all')
        
        temp_dir = tempfile.mkdtemp()
        
        try:
            quotations_dir = os.path.join(temp_dir, 'quotations')
            invoices_dir = os.path.join(temp_dir, 'invoices')
            
            if include_quotations:
                os.makedirs(quotations_dir, exist_ok=True)
            if include_invoices:
                os.makedirs(invoices_dir, exist_ok=True)
            
            documents = Quotation.objects.filter(
                user=request.user,
                created_at__gte=from_date,
                created_at__lte=datetime.combine(to_date, datetime.max.time())
            ).order_by('-created_at')
            
            if not documents.exists():
                return Response(
                    {'error': 'No documents found in the specified date range'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            viewset = QuotationViewSet()
            viewset.request = request
            
            for doc in documents:
                doc_type = doc.document_type.lower()
                
                if doc_type == 'invoice' and doc.voided:
                    continue
                
                if doc_type == 'quotation' and not include_quotations:
                    continue
                if doc_type == 'invoice' and not include_invoices:
                    continue
                
                if doc_type == 'invoice':
                    if payment_status == 'paid' and doc.payment_status != 'paid':
                        continue
                    elif payment_status == 'unpaid' and doc.payment_status == 'paid':
                        continue
                
                pdf_content = viewset._generate_pdf_content(doc, is_shared=False)
                
                date_str = doc.created_at.strftime('%Y-%m-%d')
                doc_number = doc.quotation_no or f"DOC-{doc.id}"
                filename = f"{date_str}_{doc_number}_{doc_type}.pdf"
                filename = re.sub(r'[^\w\-_\.]', '_', filename)
                
                target_dir = quotations_dir if doc_type == 'quotation' else invoices_dir
                pdf_path = os.path.join(target_dir, filename)
                
                with open(pdf_path, 'wb') as f:
                    f.write(pdf_content)
            
            zip_filename = f"bulk_export_{from_date}_{to_date}.zip"
            zip_path = os.path.join(temp_dir, zip_filename)
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                if include_quotations and os.path.exists(quotations_dir):
                    for root, dirs, files in os.walk(quotations_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, temp_dir)
                            zipf.write(file_path, arcname)
                
                if include_invoices and os.path.exists(invoices_dir):
                    for root, dirs, files in os.walk(invoices_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, temp_dir)
                            zipf.write(file_path, arcname)
            
            def cleanup():
                try:
                    shutil.rmtree(temp_dir)
                except:
                    pass
            
            # Read zip file and return it
            with open(zip_path, 'rb') as f:
                response = HttpResponse(f.read(), content_type='application/zip')
                response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            
            # Cleanup after a delay (in production, use celery or similar)
            import threading
            timer = threading.Timer(10.0, cleanup)
            timer.start()
            
            return response
            
        except Exception as e:
            shutil.rmtree(temp_dir, ignore_errors=True)
            raise e
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@swagger_auto_schema(
    method='get',
    operation_description="View shared PDF using share token (public endpoint, no authentication required)",
    manual_parameters=[
        openapi.Parameter('token', openapi.IN_PATH, description="Share token for the quotation/invoice", type=openapi.TYPE_STRING)
    ],
    responses={
        200: openapi.Response('PDF file', schema=openapi.Schema(type=openapi.TYPE_FILE)),
        404: 'Quotation/Invoice not found'
    },
    tags=['Public']
)
@api_view(['GET'])
@permission_classes([AllowAny])
def view_shared_pdf(request, token):
    """Public route to view PDF using share token - no login required"""
    try:
        quotation = get_object_or_404(Quotation, share_token=token)
        
        viewset = QuotationViewSet()
        viewset.request = request
        pdf_content = viewset._generate_pdf_content(quotation, is_shared=True)
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{quotation.quotation_no}.pdf"'
        return response
        
    except Exception as e:
        return Response(
            {'error': str(e), 'traceback': traceback.format_exc()},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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


class OrderViewSet(viewsets.ModelViewSet):
    """Order viewset"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
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
