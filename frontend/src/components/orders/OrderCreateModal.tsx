import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/orders'
import { customerService } from '@/services/customers'
import { measurementTemplateService } from '@/services/measurementTemplates'
import { measurementService } from '@/services/measurements'
import type { CreateOrderRequest, CreateOrderItem, ItemType, MeasurementTemplate, Measurement, Customer } from '@/types'
import { Button } from '@/components/common/Button'
import { CustomerForm } from '@/components/common/CustomerForm'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, X, ChevronRight, ChevronLeft, Download, CalendarIcon, Pencil, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/utils/cn'

interface OrderCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const OrderCreateModal = ({ isOpen, onClose, onSuccess }: OrderCreateModalProps) => {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<CreateOrderRequest>>({
    amount_paid: 0,
    payment_status: 'UNPAID',
    items: [],
  })

  // Form fields state
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedItemType, setSelectedItemType] = useState<ItemType | ''>('')
  const [selectedTemplate, setSelectedTemplate] = useState<MeasurementTemplate | null>(null)
  const [itemMeasurements, setItemMeasurements] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState<string>('')
  const [sampleGiven, setSampleGiven] = useState(false)
  const [designReference, setDesignReference] = useState('')
  const [itemNotes, setItemNotes] = useState('')
  const [measurementLoaded, setMeasurementLoaded] = useState(false)
  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date())
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date())
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [pendingMeasurements, setPendingMeasurements] = useState<Record<string, string> | null>(null)

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll(),
  })

  // Fetch saved measurements for selected customer
  const { data: savedMeasurements = [] } = useQuery<Measurement[]>({
    queryKey: ['customer-measurements', formData.customer],
    queryFn: () => measurementService.getAll(formData.customer!),
    enabled: !!formData.customer,
  })

  // Fetch templates for selected item type
  const { data: templates = [] } = useQuery({
    queryKey: ['measurement-templates', selectedItemType],
    queryFn: () => measurementTemplateService.getAll(selectedItemType || undefined, true),
    enabled: !!selectedItemType,
  })

  // Effect to set pending template when templates are loaded (for edit mode)
  useEffect(() => {
    if (pendingTemplateId && templates.length > 0) {
      const template = templates.find((t) => t.id === pendingTemplateId)
      if (template) {
        setSelectedTemplate(template)
        setPendingTemplateId(null)
        if (pendingMeasurements) {
          setItemMeasurements(pendingMeasurements)
          setPendingMeasurements(null)
          setMeasurementLoaded(true)
        }
      }
    }
  }, [templates, pendingTemplateId, pendingMeasurements])

  // Create order mutation
  const createOrder = useMutation({
    mutationFn: (data: CreateOrderRequest) => orderService.create(data),
    onSuccess: () => {
      onSuccess()
      handleClose()
    },
  })

  const handleClose = () => {
    setStep(1)
    setFormData({
      amount_paid: 0,
      payment_status: 'UNPAID',
      items: [],
    })
    setSelectedCustomer('')
    setSelectedItemType('')
    setSelectedTemplate(null)
    setItemMeasurements({})
    setQuantity(1)
    setUnitPrice('')
    setSampleGiven(false)
    setDesignReference('')
    setItemNotes('')
    setOrderDate(new Date())
    setDeliveryDate(new Date())
    setEditingItemIndex(null)
    setPendingTemplateId(null)
    setPendingMeasurements(null)
    onClose()
  }

  const handleAddItem = () => {
    if (!selectedTemplate || !selectedItemType) return

    // Validate all required measurements are filled
    const requiredFields = selectedTemplate.fields.map((f) => f.point)
    const missingFields = requiredFields.filter((point) => {
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

    // Convert string measurements to numbers for the item
    const numericMeasurements: Record<string, number> = {}
    Object.entries(itemMeasurements).forEach(([key, value]) => {
      numericMeasurements[key] = parseFloat(value) || 0
    })

    const newItem: CreateOrderItem = {
      template: selectedTemplate.id,
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
      setFormData((prev) => ({
        ...prev,
        items: prev.items?.map((item, i) => (i === editingItemIndex ? newItem : item)) || [],
      }))
      setEditingItemIndex(null)
    } else {
      // Add new item
      setFormData((prev) => ({
        ...prev,
        items: [...(prev.items || []), newItem],
      }))
    }

    // Reset item form
    setSelectedItemType('')
    setSelectedTemplate(null)
    setItemMeasurements({})
    setQuantity(1)
    setUnitPrice('')
    setSampleGiven(false)
    setDesignReference('')
    setItemNotes('')
    setMeasurementLoaded(false)
  }

  const handleEditItem = (index: number) => {
    const item = formData.items?.[index]
    if (!item) return

    // Convert numeric measurements to string for editing
    const stringMeasurements: Record<string, string> = {}
    Object.entries(item.measurements).forEach(([key, value]) => {
      stringMeasurements[key] = String(value)
    })

    // Set the item type first - this will trigger template fetch
    setSelectedItemType(item.item_type)
    
    // Check if templates for this item type are already loaded
    const template = templates.find((t) => t.id === item.template)
    if (template) {
      // Template is already available, set it directly
      setSelectedTemplate(template)
      setItemMeasurements(stringMeasurements)
      setMeasurementLoaded(true)
    } else {
      // Template not loaded yet, set pending state
      setPendingTemplateId(item.template)
      setPendingMeasurements(stringMeasurements)
    }
    
    // Set other fields
    setQuantity(item.quantity)
    setUnitPrice(String(item.unit_price))
    setSampleGiven(item.sample_given || false)
    setDesignReference(item.design_reference || '')
    setItemNotes(item.notes || '')
    setEditingItemIndex(index)
  }

  const handleCancelEdit = () => {
    setSelectedItemType('')
    setSelectedTemplate(null)
    setItemMeasurements({})
    setQuantity(1)
    setUnitPrice('')
    setSampleGiven(false)
    setDesignReference('')
    setItemNotes('')
    setMeasurementLoaded(false)
    setEditingItemIndex(null)
    setPendingTemplateId(null)
    setPendingMeasurements(null)
  }

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index) || [],
    }))
  }

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    setSelectedTemplate(template || null)
    // Reset measurements when template changes
    setItemMeasurements({})
    setMeasurementLoaded(false)
  }

  const handleLoadSavedMeasurement = (measurementId: string) => {
    const savedMeasurement = savedMeasurements.find((m) => m.id === measurementId)
    if (savedMeasurement && selectedTemplate) {
      // Convert saved measurements to string format for input handling
      const loadedMeasurements: Record<string, string> = {}
      Object.entries(savedMeasurement.measurements).forEach(([key, value]) => {
        loadedMeasurements[key] = String(value)
      })
      setItemMeasurements(loadedMeasurements)
      setMeasurementLoaded(true)
    }
  }

  // Filter saved measurements by selected template
  const relevantSavedMeasurements = savedMeasurements.filter(
    (m) => m.template === selectedTemplate?.id
  )

  const handleNext = () => {
    // Validate step 1
    if (!selectedCustomer || !formData.items || formData.items.length === 0) {
      alert('Please select a customer and add at least one item')
      return
    }
    setStep(2)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer || !formData.items || formData.items.length === 0) {
      return
    }

    if (!orderDate || !deliveryDate) {
      alert('Please select both order date and delivery date')
      return
    }

    // Calculate totals
    const subtotal = formData.items.reduce((sum, item) => {
      const itemTotal = item.quantity * (item.unit_price || 0)
      return sum + itemTotal
    }, 0)

    const tax = subtotal * 0.18 // 18% tax
    
    // Format dates as YYYY-MM-DD
    const orderDateStr = orderDate ? format(orderDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]
    const deliveryDateStr = deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]
    
    createOrder.mutate({
      customer: formData.customer,
      order_date: orderDateStr,
      delivery_date: deliveryDateStr,
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Create New Order</CardTitle>
              <CardDescription className="text-sm mt-1">
                Step {step} of 2: {step === 1 ? 'Order Details' : 'Pricing & Payment'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Form Fields */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer Selection */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Customer Information</h3>
                    <p className="text-sm text-muted-foreground">Select the customer for this order</p>
                  </div>
                  <div className="space-y-2 w-full lg:w-1/2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="customer">Customer *</Label>
                      <CustomerForm
                        onSuccess={(customer: Customer) => {
                          queryClient.invalidateQueries({ queryKey: ['customers'] })
                          setSelectedCustomer(customer.id)
                          setFormData((prev) => ({ ...prev, customer: customer.id }))
                        }}
                        trigger={
                          <Button type="button" variant="outline" size="sm">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Customer
                          </Button>
                        }
                      />
                    </div>
                    {customersLoading ? (
                      <div className="text-sm text-muted-foreground py-2">Loading customers...</div>
                    ) : customers.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">
                        No customers found. Please create a customer first.
                      </div>
                    ) : (
                      <Select
                        value={selectedCustomer || undefined}
                        onValueChange={(value) => {
                          setSelectedCustomer(value)
                          setFormData((prev) => ({ ...prev, customer: value }))
                        }}
                        required
                      >
                        <SelectTrigger id="customer">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} - {customer.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Order Items</h3>
                    <p className="text-sm text-muted-foreground">Add items with measurements</p>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="itemType" className="text-xs">Item Type *</Label>
                        <Select
                          value={selectedItemType || undefined}
                          onValueChange={(value) => {
                            setSelectedItemType(value as ItemType)
                            setSelectedTemplate(null)
                            setItemMeasurements({})
                            setMeasurementLoaded(false)
                          }}
                          disabled={!formData.customer}
                        >
                          <SelectTrigger id="itemType">
                            <SelectValue placeholder={formData.customer ? "Select type" : "Select customer first"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BLOUSE">Blouse</SelectItem>
                            <SelectItem value="SAREE">Saree</SelectItem>
                            <SelectItem value="DRESS">Dress</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template" className="text-xs">Measurement Template *</Label>
                        <Select
                          value={selectedTemplate?.id || undefined}
                          onValueChange={(value) => handleTemplateChange(value)}
                          disabled={!selectedItemType}
                        >
                          <SelectTrigger id="template">
                            <SelectValue placeholder={selectedItemType ? (templates.length > 0 ? "Select template" : "No templates available") : "Select item type first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Load Saved Measurements */}
                    {selectedTemplate && !measurementLoaded && relevantSavedMeasurements.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Saved Measurements - Click to load
                        </Label>
                        <div className="grid grid-cols-1 gap-2">
                          {relevantSavedMeasurements.map((measurement) => (
                            <button
                              key={measurement.id}
                              type="button"
                              onClick={() => handleLoadSavedMeasurement(measurement.id)}
                              className="text-left p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-all group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                                    <p className="text-sm font-medium truncate">
                                      {measurement.template_name || selectedTemplate.name}
                                    </p>
                                  </div>
                                  {measurement.notes && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 ml-5">
                                      {measurement.notes}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1 ml-5">
                                    {new Date(measurement.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-xs">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          disabled={!selectedTemplate}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="unitPrice" className="text-xs">Unit Price *</Label>
                        <Input
                          id="unitPrice"
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          value={unitPrice}
                          onChange={(e) => {
                            const val = e.target.value
                            // Only allow numbers and one decimal point
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setUnitPrice(val)
                            }
                          }}
                          disabled={!selectedTemplate}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs block">Sample</Label>
                        <div className="flex items-center h-10">
                          <Checkbox
                            id="sample"
                            checked={sampleGiven}
                            onChange={(e) => setSampleGiven((e.target as HTMLInputElement).checked)}
                            className="mr-2"
                            disabled={!selectedTemplate}
                          />
                          <Label htmlFor="sample" className="text-xs font-normal cursor-pointer">
                            Sample Given
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="designRef" className="text-xs">Design Reference</Label>
                        <Input
                          id="designRef"
                          type="text"
                          value={designReference}
                          onChange={(e) => setDesignReference(e.target.value)}
                          placeholder="Optional"
                          className="text-sm"
                          disabled={!selectedTemplate}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="itemNotes" className="text-xs">Notes</Label>
                        <Input
                          id="itemNotes"
                          type="text"
                          value={itemNotes}
                          onChange={(e) => setItemNotes(e.target.value)}
                          placeholder="Optional"
                          className="text-sm"
                          disabled={!selectedTemplate}
                        />
                      </div>
                    </div>

                    {/* Measurement Fields */}
                    {selectedTemplate && (
                      <div className="space-y-3 border-t pt-4">
                        <Label className="text-xs font-medium">Enter Measurements *</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedTemplate.fields.map((field) => (
                            <div key={field.point} className="space-y-1">
                              <Label htmlFor={`measure-${field.point}`} className="text-xs">
                                {field.point}: {field.label} ({field.unit})
                              </Label>
                              <Input
                                id={`measure-${field.point}`}
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*\.?[0-9]*"
                                value={itemMeasurements[field.point] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  // Only allow numbers and one decimal point
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    setItemMeasurements((prev) => ({
                                      ...prev,
                                      [field.point]: val,
                                    }))
                                  }
                                }}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                required
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!selectedTemplate}
                        size="sm"
                        className="flex-1"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {editingItemIndex !== null ? 'Update Item' : 'Add Item to Order'}
                      </Button>
                      {editingItemIndex !== null && (
                        <Button
                          type="button"
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  {formData.items && formData.items.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Added Items</Label>
                        <span className="text-xs text-muted-foreground">{formData.items.length} item(s)</span>
                      </div>
                      <div className="space-y-2">
                        {formData.items.map((item, index) => (
                          <div
                            key={index}
                            className={cn(
                              "flex items-center justify-between p-3 border rounded-md bg-background hover:bg-muted/50 transition-colors",
                              editingItemIndex === index && "ring-2 ring-primary border-primary"
                            )}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.item_type}</span>
                                <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                                <span className="text-xs text-muted-foreground">@ ₹{item.unit_price}</span>
                                {item.sample_given && (
                                  <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                    Sample
                                  </span>
                                )}
                                {editingItemIndex === index && (
                                  <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                    Editing
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {Object.entries(item.measurements).map(([point, value]) => (
                                  <span key={point} className="mr-2">
                                    {point}: {value}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(index)}
                                disabled={editingItemIndex !== null}
                                className="text-muted-foreground hover:text-primary"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                                disabled={editingItemIndex !== null}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Template Image */}
              {selectedTemplate && selectedTemplate.image_url && (
                <div className="lg:col-span-1">
                  <div className="sticky top-0 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Measurement Guide</h3>
                      <p className="text-sm text-muted-foreground">{selectedTemplate.name}</p>
                    </div>
                    <div className="bg-muted rounded-lg overflow-hidden border shadow-sm">
                      <img
                        src={selectedTemplate.image_url}
                        alt={selectedTemplate.name}
                        className="w-full h-auto object-contain"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Measurement Points</Label>
                      <div className="space-y-1">
                        {selectedTemplate.fields.map((field, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
                          >
                            <span className="font-medium">{field.point}: {field.label}</span>
                            <span className="text-muted-foreground">{field.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pricing & Payment */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Pricing & Payment</h3>
                  <p className="text-sm text-muted-foreground">Order details and payment information</p>
                </div>

                {/* Date Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderDate" className="text-xs">Order Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="orderDate"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !orderDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {orderDate ? format(orderDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-fit max-w-fit" align="start">
                        <Calendar
                          mode="single"
                          selected={orderDate}
                          onSelect={setOrderDate}
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate" className="text-xs">Delivery Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="deliveryDate"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !deliveryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-fit max-w-fit" align="start">
                        <Calendar
                          mode="single"
                          selected={deliveryDate}
                          onSelect={setDeliveryDate}
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Order Items</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium">S.No</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-medium">Unit (Qty)</th>
                          <th className="px-4 py-2 text-right text-xs font-medium">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {formData.items && formData.items.length > 0 ? (
                          formData.items.map((item, index) => {
                            const amount = item.quantity * (item.unit_price || 0)
                            return (
                              <tr key={index} className="hover:bg-muted/50">
                                <td className="px-4 py-3 text-sm">{index + 1}</td>
                                <td className="px-4 py-3 text-sm font-medium">{item.item_type}</td>
                                <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                                <td className="px-4 py-3 text-sm text-right">{(item.unit_price || 0).toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right font-medium">{amount.toFixed(2)}</td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                              No items added yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Section */}
                {formData.items && formData.items.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-full md:w-1/2 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-medium">
                            {formData.items.reduce((sum, item) => {
                              return sum + (item.quantity * (item.unit_price || 0))
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tax (18%):</span>
                          <span className="font-medium">
                            {(formData.items.reduce((sum, item) => {
                              return sum + (item.quantity * (item.unit_price || 0))
                            }, 0) * 0.18).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-semibold border-t pt-2">
                          <span>Total Amount:</span>
                          <span>
                            {(formData.items.reduce((sum, item) => {
                              return sum + (item.quantity * (item.unit_price || 0))
                            }, 0) * 1.18).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                

                {/* Payment Details */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus" className="text-xs">Payment Status</Label>
                    <Select
                      value={formData.payment_status || 'UNPAID'}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_status: value as CreateOrderRequest['payment_status'],
                        }))
                      }
                    >
                      <SelectTrigger id="paymentStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNPAID">Unpaid</SelectItem>
                        <SelectItem value="PARTIAL">Partial</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountPaid" className="text-xs">Amount Paid</Label>
                    <Input
                      id="amountPaid"
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      value={formData.amount_paid === 0 ? '' : String(formData.amount_paid ?? '')}
                      onChange={(e) => {
                        const val = e.target.value
                        // Only allow numbers and one decimal point
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setFormData((prev) => ({
                            ...prev,
                            amount_paid: val === '' ? 0 : parseFloat(val) || 0,
                          }))
                        }
                      }}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-xs">Method</Label>
                    <Select
                      value={formData.payment_method || undefined}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          payment_method: value as CreateOrderRequest['payment_method'],
                        }))
                      }
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="BANK">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-xs">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="resize-none text-sm"
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>

              {/* Error Message */}
              {createOrder.isError && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
                  {createOrder.error instanceof Error
                    ? createOrder.error.message
                    : 'Failed to create order'}
                </div>
              )}
            </form>
          )}
        </CardContent>

        {/* Footer with Navigation */}
        <div className="border-t p-4 flex justify-between items-center">
          <div>
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={createOrder.isPending}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createOrder.isPending}
            >
              Cancel
            </Button>
            {step === 1 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!selectedCustomer || !formData.items || formData.items.length === 0}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

