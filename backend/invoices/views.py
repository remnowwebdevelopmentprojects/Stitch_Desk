from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime
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
from subscriptions.permissions import ReadOnlyIfExpired

from .models import Quotation, Item, Invoice, InvoiceItem
from .serializers import ItemSerializer, QuotationSerializer, InvoiceSerializer, InvoiceCreateSerializer, InvoiceUpdateSerializer
from accounts.views import get_or_create_shop
from django.db.models import Q


class ItemViewSet(viewsets.ModelViewSet):
    """Item viewset"""
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Item.objects.filter(user=self.request.user).order_by('description')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


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


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoices linked to orders.

    Supports creating invoices from orders or standalone, PDF generation with templates.
    """
    permission_classes = [IsAuthenticated, ReadOnlyIfExpired]

    def get_queryset(self):
        queryset = Invoice.objects.filter(user=self.request.user)

        # Filter by customer
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer__id=customer_id)

        # Filter by order
        order_id = self.request.query_params.get('order', None)
        if order_id:
            queryset = queryset.filter(order__id=order_id)

        # Search by invoice number or customer name
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(customer__name__icontains=search)
            )

        return queryset.select_related('customer', 'order').prefetch_related('items')

    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InvoiceUpdateSerializer
        return InvoiceSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @swagger_auto_schema(tags=['Invoices'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Invoices'])
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Invoices'])
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Invoices'])
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Invoices'])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_description="Populate invoice items from linked order",
        responses={
            200: InvoiceSerializer,
            400: 'Invoice is not linked to an order'
        },
        tags=['Invoices']
    )
    @action(detail=True, methods=['post'])
    def populate_from_order(self, request, pk=None):
        """Populate invoice items from the linked order"""
        invoice = self.get_object()

        if not invoice.order:
            return Response(
                {'error': 'Invoice is not linked to an order'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Clear existing items
        invoice.items.all().delete()

        # Create items from order
        order = invoice.order
        for order_item in order.items.all():
            InvoiceItem.objects.create(
                invoice=invoice,
                item_description=f"{order_item.template.name if order_item.template else order_item.item_type}",
                quantity=order_item.quantity,
                unit='PCS',
                unit_price=order_item.unit_price or 0,
                amount=(order_item.unit_price or 0) * order_item.quantity,
                order_item=order_item
            )

        invoice.calculate_totals()
        invoice.save()

        return Response(InvoiceSerializer(invoice).data)

    @swagger_auto_schema(
        operation_description="Generate and download PDF for invoice",
        responses={
            200: openapi.Response('PDF file', schema=openapi.Schema(type=openapi.TYPE_FILE)),
            500: 'PDF generation failed'
        },
        tags=['Invoices']
    )
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for invoice using selected template"""
        invoice = self.get_object()

        try:
            # Get shop settings for template selection
            shop = get_or_create_shop(request.user)
            template_name = shop.invoice_template if shop else 'classic'

            pdf_content = self._generate_invoice_pdf(invoice, template_name, shop)

            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
            return response

        except Exception as e:
            return Response(
                {'error': str(e), 'traceback': traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_description="Generate and download POS bill for invoice",
        manual_parameters=[
            openapi.Parameter(
                'template',
                openapi.IN_QUERY,
                description="POS template: thermal or compact (default: thermal)",
                type=openapi.TYPE_STRING,
                enum=['thermal', 'compact']
            )
        ],
        responses={
            200: openapi.Response('PDF file', schema=openapi.Schema(type=openapi.TYPE_FILE)),
            500: 'PDF generation failed'
        },
        tags=['Invoices']
    )
    @action(detail=True, methods=['get'], url_path='pos-bill')
    def pos_bill(self, request, pk=None):
        """Generate POS bill PDF for invoice"""
        invoice = self.get_object()
        template = request.query_params.get('template', 'thermal')
        
        if template not in ['thermal', 'compact']:
            template = 'thermal'

        try:
            shop = get_or_create_shop(request.user)
            pdf_content = self._generate_pos_bill_pdf(invoice, template, shop)

            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}_pos.pdf"'
            return response

        except Exception as e:
            return Response(
                {'error': str(e), 'traceback': traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _generate_invoice_pdf(self, invoice, template_name, shop):
        """Generate PDF using the selected template"""
        from django.conf import settings
        from decimal import Decimal

        # Prepare context data
        formatted_date = invoice.invoice_date.strftime('%d-%b-%Y')

        # Calculate tax amounts for display
        subtotal = invoice.subtotal or Decimal('0')
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = Decimal('0')

        if invoice.gst_type == 'intrastate':
            cgst_amount = subtotal * (invoice.cgst_percent or Decimal('0')) / Decimal('100')
            sgst_amount = subtotal * (invoice.sgst_percent or Decimal('0')) / Decimal('100')
        elif invoice.gst_type == 'interstate':
            igst_amount = subtotal * (invoice.igst_percent or Decimal('0')) / Decimal('100')

        # Build items HTML
        items_html = ''
        for index, item in enumerate(invoice.items.all(), start=1):
            items_html += f'''
                <tr>
                    <td class="text-center">{index}</td>
                    <td>{escape(item.item_description)}</td>
                    <td class="text-center">{item.quantity} {item.unit}</td>
                    <td class="text-right">₹{item.unit_price:.2f}</td>
                    <td class="text-right">₹{item.amount:.2f}</td>
                </tr>
            '''

        # Get logo URL and create img tag
        logo_html = ''
        if shop and shop.logo:
            logo_path = os.path.join(settings.BASE_DIR, 'media', str(shop.logo))
            if os.path.exists(logo_path):
                logo_url = f'file:///{logo_path.replace(chr(92), "/")}'
                logo_html = f'<img src="{logo_url}" alt="Logo" />'

        # Load the appropriate template
        template_dir = os.path.join(settings.BASE_DIR, 'templates', 'invoices')
        template_file = os.path.join(template_dir, f'{template_name}.html')

        # Fallback to classic if template doesn't exist
        if not os.path.exists(template_file):
            template_file = os.path.join(template_dir, 'classic.html')

        # If still doesn't exist, use built-in template
        if not os.path.exists(template_file):
            html_content = self._get_default_invoice_template(
                invoice, shop, formatted_date, items_html,
                subtotal, cgst_amount, sgst_amount, igst_amount, logo_html
            )
        else:
            with open(template_file, 'r', encoding='utf-8') as f:
                html_template = f.read()

            # Replace placeholders
            html_content = html_template
            html_content = html_content.replace('{{shop_name}}', escape(shop.shop_name if shop else 'My Shop'))
            html_content = html_content.replace('{{shop_address}}', escape(shop.full_address or '') if shop else '')
            html_content = html_content.replace('{{shop_phone}}', escape(shop.phone_number or '') if shop else '')
            html_content = html_content.replace('{{shop_email}}', escape(shop.email or '') if shop else '')
            html_content = html_content.replace('{{shop_gst}}', escape(shop.gst_number or '') if shop else '')
            html_content = html_content.replace('{{logo_url}}', logo_html)

            html_content = html_content.replace('{{invoice_number}}', escape(invoice.invoice_number))
            html_content = html_content.replace('{{invoice_date}}', formatted_date)

            html_content = html_content.replace('{{customer_name}}', escape(invoice.customer.name))
            html_content = html_content.replace('{{customer_phone}}', escape(invoice.customer.phone or ''))
            html_content = html_content.replace('{{customer_address}}', escape(invoice.customer_address or '').replace('\n', '<br>'))

            html_content = html_content.replace('{{items}}', items_html)

            html_content = html_content.replace('{{subtotal}}', f'₹{subtotal:.2f}')
            html_content = html_content.replace('{{cgst_percent}}', f'{invoice.cgst_percent or 0}')
            html_content = html_content.replace('{{cgst_amount}}', f'₹{cgst_amount:.2f}')
            html_content = html_content.replace('{{sgst_percent}}', f'{invoice.sgst_percent or 0}')
            html_content = html_content.replace('{{sgst_amount}}', f'₹{sgst_amount:.2f}')
            html_content = html_content.replace('{{igst_percent}}', f'{invoice.igst_percent or 0}')
            html_content = html_content.replace('{{igst_amount}}', f'₹{igst_amount:.2f}')
            html_content = html_content.replace('{{tax_amount}}', f'₹{invoice.tax_amount:.2f}')
            html_content = html_content.replace('{{total_amount}}', f'₹{invoice.total_amount:.2f}')

            html_content = html_content.replace('{{gst_type}}', invoice.gst_type or '')
            html_content = html_content.replace('{{terms}}', escape(invoice.terms_and_conditions or '').replace('\n', '<br>'))

            # Handle conditional GST display
            if invoice.gst_type == 'intrastate':
                html_content = html_content.replace('{{show_intrastate}}', '')
                html_content = html_content.replace('{{/show_intrastate}}', '')
                html_content = re.sub(r'\{\{show_interstate\}\}.*?\{\{/show_interstate\}\}', '', html_content, flags=re.DOTALL)
            elif invoice.gst_type == 'interstate':
                html_content = html_content.replace('{{show_interstate}}', '')
                html_content = html_content.replace('{{/show_interstate}}', '')
                html_content = re.sub(r'\{\{show_intrastate\}\}.*?\{\{/show_intrastate\}\}', '', html_content, flags=re.DOTALL)
            else:
                html_content = re.sub(r'\{\{show_intrastate\}\}.*?\{\{/show_intrastate\}\}', '', html_content, flags=re.DOTALL)
                html_content = re.sub(r'\{\{show_interstate\}\}.*?\{\{/show_interstate\}\}', '', html_content, flags=re.DOTALL)

        # Generate PDF with WeasyPrint
        base_dir = str(settings.BASE_DIR)
        html_doc = HTML(string=html_content, base_url=base_dir)

        page_css = CSS(string='''
            @page {
                size: A4;
                margin: 0;
            }
        ''')

        pdf_content = html_doc.write_pdf(stylesheets=[page_css])
        return pdf_content

    def _get_default_invoice_template(self, invoice, shop, formatted_date, items_html,
                                       subtotal, cgst_amount, sgst_amount, igst_amount, logo_html):
        """Fallback built-in invoice template"""
        from decimal import Decimal

        shop_name = escape(shop.shop_name) if shop else 'My Shop'
        shop_address = escape(shop.full_address or '') if shop else ''
        shop_phone = escape(shop.phone_number or '') if shop else ''
        shop_gst = escape(shop.gst_number or '') if shop else ''

        customer_name = escape(invoice.customer.name)
        customer_address = escape(invoice.customer_address or '').replace('\n', '<br>')
        customer_phone = escape(invoice.customer.phone or '')

        # GST section
        gst_html = ''
        if invoice.gst_type == 'intrastate':
            gst_html = f'''
                <tr>
                    <td colspan="4" class="text-right"><strong>CGST ({invoice.cgst_percent}%):</strong></td>
                    <td class="text-right">₹{cgst_amount:.2f}</td>
                </tr>
                <tr>
                    <td colspan="4" class="text-right"><strong>SGST ({invoice.sgst_percent}%):</strong></td>
                    <td class="text-right">₹{sgst_amount:.2f}</td>
                </tr>
            '''
        elif invoice.gst_type == 'interstate':
            gst_html = f'''
                <tr>
                    <td colspan="4" class="text-right"><strong>IGST ({invoice.igst_percent}%):</strong></td>
                    <td class="text-right">₹{igst_amount:.2f}</td>
                </tr>
            '''

        terms = escape(invoice.terms_and_conditions or '').replace('\n', '<br>')

        logo_html = f'<img src="{logo_url}" style="max-width: 120px; max-height: 80px;">' if logo_url else ''

        return f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Invoice - {escape(invoice.invoice_number)}</title>
            <style>
                @page {{ size: A4; margin: 15mm; }}
                body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; font-size: 12px; line-height: 1.5; }}
                .header {{ display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333; }}
                .logo-section {{ flex: 1; }}
                .shop-info {{ text-align: right; flex: 1; }}
                .shop-name {{ font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }}
                .invoice-title {{ font-size: 28px; font-weight: bold; text-align: center; margin: 20px 0; color: #333; }}
                .info-section {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
                .customer-info, .invoice-info {{ width: 48%; }}
                .section-title {{ font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th {{ background-color: #f5f5f5; padding: 12px 8px; text-align: left; border: 1px solid #ddd; font-weight: 600; }}
                td {{ padding: 10px 8px; border: 1px solid #ddd; }}
                .text-center {{ text-align: center; }}
                .text-right {{ text-align: right; }}
                .total-row {{ background-color: #f9f9f9; font-weight: bold; }}
                .grand-total {{ background-color: #333; color: white; font-size: 14px; }}
                .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }}
                .terms {{ font-size: 11px; color: #666; }}
                .thank-you {{ text-align: center; margin-top: 30px; font-size: 14px; font-weight: 500; }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-section">
                    {logo_html}
                    <div class="shop-name">{shop_name}</div>
                    <div>{shop_address}</div>
                    <div>Phone: {shop_phone}</div>
                    {f'<div>GST: {shop_gst}</div>' if shop_gst else ''}
                </div>
                <div class="shop-info">
                    <div class="invoice-title">INVOICE</div>
                </div>
            </div>

            <div class="info-section">
                <div class="customer-info">
                    <div class="section-title">Bill To:</div>
                    <div><strong>{customer_name}</strong></div>
                    <div>{customer_address}</div>
                    <div>Phone: {customer_phone}</div>
                </div>
                <div class="invoice-info">
                    <div class="section-title">Invoice Details:</div>
                    <div><strong>Invoice No:</strong> {escape(invoice.invoice_number)}</div>
                    <div><strong>Date:</strong> {formatted_date}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width: 8%;">S.No</th>
                        <th style="width: 42%;">Item Description</th>
                        <th class="text-center" style="width: 15%;">Qty / Unit</th>
                        <th class="text-right" style="width: 17%;">Unit Price</th>
                        <th class="text-right" style="width: 18%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                    <tr class="total-row">
                        <td colspan="4" class="text-right"><strong>Subtotal:</strong></td>
                        <td class="text-right">₹{subtotal:.2f}</td>
                    </tr>
                    {gst_html}
                    <tr class="grand-total">
                        <td colspan="4" class="text-right"><strong>Total Amount:</strong></td>
                        <td class="text-right"><strong>₹{invoice.total_amount:.2f}</strong></td>
                    </tr>
                </tbody>
            </table>

            <div class="footer">
                <div class="section-title">Terms & Conditions:</div>
                <div class="terms">{terms}</div>
            </div>

            <div class="thank-you">Thank you for your business!</div>
        </body>
        </html>
        '''
    def _generate_pos_bill_pdf(self, invoice, template, shop):
        """Generate POS bill PDF using the selected template"""
        from django.conf import settings
        from decimal import Decimal

        # Prepare context data
        formatted_date = invoice.invoice_date.strftime('%d-%b-%Y')

        # Calculate tax amounts
        subtotal = invoice.subtotal or Decimal('0')
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = Decimal('0')

        if invoice.gst_type == 'intrastate':
            cgst_amount = subtotal * (invoice.cgst_percent or Decimal('0')) / Decimal('100')
            sgst_amount = subtotal * (invoice.sgst_percent or Decimal('0')) / Decimal('100')
        elif invoice.gst_type == 'interstate':
            igst_amount = subtotal * (invoice.igst_percent or Decimal('0')) / Decimal('100')

        # Build items HTML
        items_html = ''
        for index, item in enumerate(invoice.items.all(), start=1):
            if template == 'thermal':
                items_html += f'''
            <tr>
                <td>{escape(item.item_description)[:30]}</td>
                <td class="qty">{item.quantity}</td>
                <td class="price">₹{item.unit_price:.2f}</td>
                <td class="amount">₹{item.amount:.2f}</td>
            </tr>'''
            else:
                items_html += f'''
            <tr>
                <td class="sno">{index}</td>
                <td class="desc">{escape(item.item_description)}</td>
                <td class="qty">{item.quantity} {item.unit}</td>
                <td class="price">₹{item.unit_price:.2f}</td>
                <td class="amount">₹{item.amount:.2f}</td>
            </tr>'''

        # Build tax rows HTML
        tax_rows_html = ''
        if invoice.gst_type == 'intrastate':
            if template == 'thermal':
                tax_rows_html = f'''
        <div class="total-row">
            <span>CGST ({invoice.cgst_percent}%):</span>
            <span>₹{cgst_amount:.2f}</span>
        </div>
        <div class="total-row">
            <span>SGST ({invoice.sgst_percent}%):</span>
            <span>₹{sgst_amount:.2f}</span>
        </div>'''
            else:
                tax_rows_html = f'''
                    <tr>
                        <td class="label">CGST ({invoice.cgst_percent}%):</td>
                        <td class="value">₹{cgst_amount:.2f}</td>
                    </tr>
                    <tr>
                        <td class="label">SGST ({invoice.sgst_percent}%):</td>
                        <td class="value">₹{sgst_amount:.2f}</td>
                    </tr>'''
        elif invoice.gst_type == 'interstate':
            if template == 'thermal':
                tax_rows_html = f'''
        <div class="total-row">
            <span>IGST ({invoice.igst_percent}%):</span>
            <span>₹{igst_amount:.2f}</span>
        </div>'''
            else:
                tax_rows_html = f'''
                    <tr>
                        <td class="label">IGST ({invoice.igst_percent}%):</td>
                        <td class="value">₹{igst_amount:.2f}</td>
                    </tr>'''

        # Load the template
        template_dir = os.path.join(settings.BASE_DIR, 'templates', 'pos_bills')
        template_file = os.path.join(template_dir, f'{template}.html')

        if not os.path.exists(template_file):
            raise Exception(f'POS template not found: {template}')

        with open(template_file, 'r', encoding='utf-8') as f:
            html_template = f.read()

        # Replace placeholders
        html_content = html_template
        html_content = html_content.replace('{{shop_name}}', escape(shop.shop_name if shop else 'My Shop'))
        html_content = html_content.replace('{{shop_address}}', escape(shop.full_address or '') if shop else '')
        html_content = html_content.replace('{{shop_phone}}', escape(shop.phone_number or '') if shop else '')
        html_content = html_content.replace('{{shop_gst}}', escape(shop.gst_number or '') if shop else '')

        html_content = html_content.replace('{{invoice_number}}', escape(invoice.invoice_number))
        html_content = html_content.replace('{{invoice_date}}', formatted_date)

        html_content = html_content.replace('{{customer_name}}', escape(invoice.customer.name))
        html_content = html_content.replace('{{customer_phone}}', escape(invoice.customer.phone or ''))

        html_content = html_content.replace('{{items}}', items_html)
        html_content = html_content.replace('{{tax_rows}}', tax_rows_html)

        html_content = html_content.replace('{{subtotal}}', f'₹{subtotal:.2f}')
        html_content = html_content.replace('{{total_amount}}', f'₹{invoice.total_amount:.2f}')
        html_content = html_content.replace('{{terms}}', escape(invoice.terms_and_conditions or '').replace('\n', '<br>'))

        # Handle conditional sections for Handlebars-like syntax
        html_content = re.sub(r'\{\{#if shop_gst\}\}(.*?)\{\{/if\}\}', 
                             lambda m: m.group(1) if shop and shop.gst_number else '', 
                             html_content, flags=re.DOTALL)
        html_content = re.sub(r'\{\{#if customer_phone\}\}(.*?)\{\{/if\}\}', 
                             lambda m: m.group(1) if invoice.customer.phone else '', 
                             html_content, flags=re.DOTALL)
        html_content = re.sub(r'\{\{#if terms\}\}(.*?)\{\{/if\}\}', 
                             lambda m: m.group(1) if invoice.terms_and_conditions else '', 
                             html_content, flags=re.DOTALL)

        # Generate PDF with WeasyPrint
        base_dir = str(settings.BASE_DIR)
        html_doc = HTML(string=html_content, base_url=base_dir)

        pdf_content = html_doc.write_pdf()
        return pdf_content