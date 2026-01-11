import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { orderService } from '@/services/orders'
import { measurementTemplateService } from '@/services/measurementTemplates'
import { settingsService } from '@/services/settings'
import { Button } from '@/components/common/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { X, CalendarIcon, Plus, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/utils/cn'
import type { CreateOrderRequest, CreateOrderItem, ItemType, OrderStatus } from '@/types'

interface OrderEditModalProps {
  orderId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const OrderEditModal = ({ orderId, isOpen, onClose, onSuccess }: OrderEditModalProps) => {
  const [formData, setFormData] = useState<Partial<CreateOrderRequest>>({
    amount_paid: 0,
    payment_status: 'UNPAID',
    items: [],
  })
  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date())
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date())
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('PENDING')
  
  // Item editing states
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [selectedItemType, setSelectedItemType] = useState<ItemType | ''>('')
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [itemMeasurements, setItemMeasurements] = useState<Record<string, string>>({})
  const [sampleGiven, setSampleGiven] = useState(false)
  const [designReference, setDesignReference] = useState('')
  const [itemNotes, setItemNotes] = useState('')

  // Fetch order data
  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => orderService.getById(orderId!),
    enabled: !!orderId && isOpen,
  })

  // Fetch settings to check tax type
  const { data: settings } = useQuery({
    queryKey: ['allSettings'],
    queryFn: () => settingsService.getAllSettings(),
  })

  // Fetch templates for selected item type
  const { data: templates = [] } = useQuery({
    queryKey: ['measurement-templates', selectedItemType],
    queryFn: () => measurementTemplateService.getAll(selectedItemType || undefined, true),
    enabled: !!selectedItemType,
  })

  // Load order data into form when order is fetched
  useEffect(() => {
    if (order && isOpen) {
      console.log('Loading order data:', order.status, order)
      // Convert order items to CreateOrderItem format
      const orderItems: CreateOrderItem[] = order.items?.map(item => ({
        template: item.template || '',
        item_type: item.item_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        measurements: item.measurements,
        sample_given: item.sample_given,
        design_reference: item.design_reference,
        notes: item.notes,
      })) || []

      setFormData({
        customer: order.customer,
        payment_status: order.payment_status || 'UNPAID',
        amount_paid: order.amount_paid,
        payment_method: order.payment_method,
        notes: order.notes,
        items: orderItems,
      })
      setOrderDate(new Date(order.order_date))
      setDeliveryDate(new Date(order.delivery_date))
      setOrderStatus(order.status || 'PENDING')
      console.log('Set order status to:', order.status || 'PENDING')
    }
  }, [order, isOpen])

  // Update order mutation
  const updateOrder = useMutation({
    mutationFn: (data: Partial<CreateOrderRequest>) => orderService.update(orderId!, data),
    onSuccess: () => {
      onSuccess()
      handleClose()
    },
  })

  const handleClose = () => {
    // Reset all form state
    setFormData({
      amount_paid: 0,
      payment_status: 'UNPAID',
      items: [],
    })
    setOrderDate(new Date())
    setDeliveryDate(new Date())
    setOrderStatus('PENDING')
    setEditingItemIndex(null)
    resetItemForm()
    onClose()
  }

  const resetItemForm = () => {
    setEditingItemIndex(null)
    setSelectedItemType('')
    setSelectedTemplate('')
    setItemMeasurements({})
    setQuantity(1)
    setUnitPrice('')
    setSampleGiven(false)
    setDesignReference('')
    setItemNotes('')
  }

  const handleAddOrUpdateItem = () => {
    if (!selectedTemplate || !selectedItemType) {
      alert('Please select item type and template')
      return
    }

    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return

    // Validate measurements
    const requiredFields = template.fields.map(f => f.point)
    const missingFields = requiredFields.filter(point => {
      const val = itemMeasurements[point]
      return !val || val.trim() === '' || parseFloat(val) <= 0
    })

    if (missingFields.length > 0) {
      alert(`Please fill all measurement fields: ${missingFields.join(', ')}`)
      return
    }

    const priceValue = parseFloat(unitPrice)
    if (!unitPrice || isNaN(priceValue) || priceValue <= 0) {
      alert('Please enter a valid unit price')
      return
    }

    // Convert measurements to numbers
    const numericMeasurements: Record<string, number> = {}
    Object.entries(itemMeasurements).forEach(([key, value]) => {
      numericMeasurements[key] = parseFloat(value) || 0
    })

    const newItem: CreateOrderItem = {
      template: selectedTemplate,
      item_type: selectedItemType,
      quantity,
      unit_price: priceValue,
      measurements: numericMeasurements,
      sample_given: sampleGiven,
      design_reference: designReference || undefined,
      notes: itemNotes || undefined,
    }

    if (editingItemIndex !== null) {
      // Update existing item
      setFormData(prev => ({
        ...prev,
        items: prev.items?.map((item, i) => i === editingItemIndex ? newItem : item) || [],
      }))
    } else {
      // Add new item
      setFormData(prev => ({
        ...prev,
        items: [...(prev.items || []), newItem],
      }))
    }

    resetItemForm()
  }

  const handleEditItem = (index: number) => {
    const item = formData.items?.[index]
    if (!item) return

    setSelectedItemType(item.item_type)
    setSelectedTemplate(item.template)
    setQuantity(item.quantity)
    setUnitPrice(String(item.unit_price || ''))
    setSampleGiven(item.sample_given || false)
    setDesignReference(item.design_reference || '')
    setItemNotes(item.notes || '')
    
    // Convert measurements to strings
    const stringMeasurements: Record<string, string> = {}
    Object.entries(item.measurements).forEach(([key, value]) => {
      stringMeasurements[key] = String(value)
    })
    setItemMeasurements(stringMeasurements)
    setEditingItemIndex(index)
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index) || [],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.items || formData.items.length === 0) {
      alert('Please add at least one item')
      return
    }

    if (!orderDate || !deliveryDate) {
      alert('Please select both order date and delivery date')
      return
    }

    // Calculate totals
    const subtotal = formData.items.reduce((sum, item) => {
      return sum + (item.quantity * (item.unit_price || 0))
    }, 0)
    // Only apply tax if default_tax_type is GST
    const tax = settings?.default_tax_type === 'GST' ? subtotal * 0.18 : 0

    // Format dates as YYYY-MM-DD
    const orderDateStr = format(orderDate, 'yyyy-MM-dd')
    const deliveryDateStr = format(deliveryDate, 'yyyy-MM-dd')

    updateOrder.mutate({
      order_date: orderDateStr,
      delivery_date: deliveryDateStr,
      status: orderStatus,
      stitching_charge: subtotal,
      extra_charge: 0,
      discount: 0,
      tax: tax,
      payment_status: formData.payment_status || 'UNPAID',
      amount_paid: formData.amount_paid ?? 0,
      payment_method: formData.payment_method,
      notes: formData.notes,
      items: formData.items,
    })
  }

  if (!isOpen || !orderId) return null

  const selectedTemplateObj = templates.find(t => t.id === selectedTemplate)

  return (
    <div key={orderId} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Edit Order</CardTitle>
              {order && (
                <CardDescription className="text-sm mt-1">
                  Order #{order.order_number} - {order.customer_name}
                </CardDescription>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">Loading order details...</div>
          ) : order ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Order Items */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Order Items</h3>
                  
                  {/* Add/Edit Item Form */}
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Item Type *</Label>
                        <Select value={selectedItemType || undefined} onValueChange={(value) => setSelectedItemType(value as ItemType)}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BLOUSE">Blouse</SelectItem>
                            <SelectItem value="SAREE">Saree</SelectItem>
                            <SelectItem value="DRESS">Dress</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Template *</Label>
                        <Select value={selectedTemplate || undefined} onValueChange={setSelectedTemplate} disabled={!selectedItemType}>
                          <SelectTrigger><SelectValue placeholder={selectedItemType ? "Select template" : "Select type first"} /></SelectTrigger>
                          <SelectContent>
                            {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Quantity *</Label>
                        <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Unit Price *</Label>
                        <Input 
                          type="text" 
                          inputMode="decimal"
                          value={unitPrice} 
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setUnitPrice(val)
                          }} 
                          placeholder="0.00" 
                        />
                      </div>
                    </div>

                    {selectedTemplateObj && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Measurements *</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedTemplateObj.fields.map(field => (
                            <div key={field.point} className="space-y-1">
                              <Label className="text-xs">{field.point}: {field.label} ({field.unit})</Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={itemMeasurements[field.point] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    setItemMeasurements(prev => ({ ...prev, [field.point]: val }))
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="button" onClick={handleAddOrUpdateItem} disabled={!selectedTemplate} size="sm" className="flex-1">
                        <Plus className="w-4 h-4 mr-1" />
                        {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
                      </Button>
                      {editingItemIndex !== null && (
                        <Button type="button" onClick={resetItemForm} variant="outline" size="sm">Cancel</Button>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  {formData.items && formData.items.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Added Items ({formData.items.length})</Label>
                      {formData.items.map((item, index) => (
                        <div key={index} className={cn("flex items-center justify-between p-3 border rounded-md", editingItemIndex === index && "ring-2 ring-primary")}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{item.item_type}</span>
                              <span className="text-xs text-muted-foreground">× {item.quantity} @ ₹{item.unit_price}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Total: ₹{((item.unit_price || 0) * item.quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleEditItem(index)} disabled={editingItemIndex !== null}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(index)} disabled={editingItemIndex !== null} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="bg-muted p-3 rounded-md">
                        <div className="flex justify-between font-semibold">
                          <span>Total Amount:</span>
                          <span>₹{(formData.items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0) * (settings?.default_tax_type === 'GST' ? 1.18 : 1)).toFixed(2)}</span>
                        </div>
                        {settings?.default_tax_type === 'GST' && (
                          <span className="text-xs text-muted-foreground">(Including 18% tax)</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Order Details */}
                <div key={`order-details-${orderId}`} className="space-y-4">
                  <h3 className="text-lg font-semibold">Order Details</h3>
                  
                  {/* Order Status */}
                  <div className="space-y-2">
                    <Label>Order Status</Label>
                    {orderStatus && (
                      <Select
                        key={orderStatus}
                        defaultValue={orderStatus}
                        value={orderStatus}
                        onValueChange={(value) => setOrderStatus(value as OrderStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="IN_STITCHING">In Stitching</SelectItem>
                          <SelectItem value="READY">Ready</SelectItem>
                          <SelectItem value="DELIVERED">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Order Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !orderDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {orderDate ? format(orderDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-fit"><Calendar mode="single" selected={orderDate} onSelect={setOrderDate} /></PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deliveryDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-fit"><Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} /></PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Payment Information</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Payment Status</Label>
                        <Select key={`payment-status-${orderId}`} value={formData.payment_status || 'UNPAID'} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_status: value as any }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNPAID">Unpaid</SelectItem>
                            <SelectItem value="PARTIAL">Partial</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Amount Paid</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={formData.amount_paid === 0 ? '' : String(formData.amount_paid ?? '')}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setFormData(prev => ({ ...prev, amount_paid: val === '' ? 0 : parseFloat(val) || 0 }))
                            }
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Method</Label>
                        <Select value={formData.payment_method || undefined} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value as any }))}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="BANK">Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="Additional notes (optional)"
                    />
                  </div>
                </div>
              </div>

              {updateOrder.isError && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
                  {updateOrder.error instanceof Error ? updateOrder.error.message : 'Failed to update order'}
                </div>
              )}
            </form>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Order not found</div>
          )}
        </CardContent>

        <div className="border-t p-4 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={updateOrder.isPending}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={updateOrder.isPending || isLoading}>
            {updateOrder.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
