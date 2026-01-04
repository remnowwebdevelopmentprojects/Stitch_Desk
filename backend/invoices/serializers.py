from rest_framework import serializers
from .models import Quotation, Item, Invoice, InvoiceItem


class ItemSerializer(serializers.ModelSerializer):
    """Item serializer"""
    class Meta:
        model = Item
        fields = ['id', 'description', 'hsn_code', 'default_rate', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuotationSerializer(serializers.ModelSerializer):
    """Quotation/Invoice serializer"""
    class Meta:
        model = Quotation
        fields = ['id', 'quotation_no', 'date', 'to_address', 'client_phone',
                  'currency', 'document_type', 'payment_status', 'bank_name',
                  'branch_name', 'account_name', 'account_number', 'ifsc_code',
                  'gpay_phonepe', 'gst_type', 'cgst_rate', 'sgst_rate', 'igst_rate',
                  'items', 'sub_total', 'gst_amount', 'total_amount', 'share_token',
                  'voided', 'created_at']
        read_only_fields = ['id', 'share_token', 'created_at']
    
    def validate_account_number(self, value):
        """Clean account number - remove 'w' prefix if present"""
        if value:
            clean_account = str(value).strip()
            if clean_account.lower().startswith('w'):
                clean_account = clean_account[1:]
            return clean_account.strip()
        return value
    
    def validate(self, attrs):
        # Calculate sub_total
        sub_total = 0
        items = attrs.get('items', [])
        for item in items:
            if 'amount' in item and item['amount']:
                try:
                    sub_total += float(item['amount'])
                except (ValueError, TypeError):
                    pass
        
        # Calculate GST amount and total
        gst_amount = 0
        gst_type = attrs.get('gst_type')
        currency = attrs.get('currency', 'INR')
        
        if currency == 'INR' and gst_type:
            if gst_type == 'intrastate':
                cgst_rate = float(attrs.get('cgst_rate', 0) or 0)
                sgst_rate = float(attrs.get('sgst_rate', 0) or 0)
                gst_amount = (sub_total * cgst_rate / 100) + (sub_total * sgst_rate / 100)
            elif gst_type == 'interstate':
                igst_rate = float(attrs.get('igst_rate', 0) or 0)
                gst_amount = sub_total * igst_rate / 100
        
        total = sub_total + gst_amount
        
        attrs['sub_total'] = sub_total
        attrs['gst_amount'] = gst_amount
        attrs['total_amount'] = total

        return attrs


# ========== Invoice Serializers ==========

class InvoiceItemSerializer(serializers.ModelSerializer):
    """Invoice Item serializer for reading"""

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'item_description', 'quantity', 'unit', 'unit_price', 'amount',
            'order_item', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceItemCreateSerializer(serializers.ModelSerializer):
    """Invoice Item serializer for creating/updating"""

    class Meta:
        model = InvoiceItem
        fields = ['item_description', 'quantity', 'unit', 'unit_price', 'amount', 'order_item']

    def validate_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Amount cannot be negative")
        return value

    def validate_unit_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Unit price cannot be negative")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    """Invoice serializer for reading - includes nested items and customer details"""
    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True, allow_null=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'order', 'order_number',
            'customer', 'customer_name', 'customer_phone', 'customer_address',
            'gst_type', 'cgst_percent', 'sgst_percent', 'igst_percent',
            'subtotal', 'tax_amount', 'total_amount', 'notes', 'terms_and_conditions',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'tax_amount',
            'total_amount', 'created_at', 'updated_at'
        ]


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Invoice creation serializer with nested items"""
    items = InvoiceItemCreateSerializer(many=True)

    class Meta:
        model = Invoice
        fields = [
            'invoice_date', 'order', 'customer', 'customer_address',
            'gst_type', 'cgst_percent', 'sgst_percent', 'igst_percent',
            'notes', 'terms_and_conditions', 'items'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)

        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)

        invoice.calculate_totals()
        invoice.save()
        return invoice

    def validate_items(self, value):
        if not value or len(value) == 0:
            raise serializers.ValidationError("At least one item is required")
        return value

    def validate(self, attrs):
        # If order is provided, validate customer matches
        order = attrs.get('order')
        customer = attrs.get('customer')

        if order and customer:
            if order.customer.id != customer.id:
                raise serializers.ValidationError({
                    "customer": "Customer must match the order's customer when linking to an order"
                })

        return attrs


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    """Invoice update serializer - allows updating items"""
    items = InvoiceItemCreateSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = [
            'invoice_date', 'customer_address', 'gst_type',
            'cgst_percent', 'sgst_percent', 'igst_percent',
            'notes', 'terms_and_conditions', 'items'
        ]

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Update invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # If items provided, replace all items
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)

        instance.calculate_totals()
        instance.save()
        return instance

