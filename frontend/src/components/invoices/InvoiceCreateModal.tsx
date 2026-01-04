import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { customerService } from '@/services/customers'
import { orderService } from '@/services/orders'
import { invoiceService } from '@/services/invoices'
import { settingsService } from '@/services/settings'
import type { CreateInvoiceRequest, CreateInvoiceItem, Customer, Order, GstType } from '@/types'
import { Plus, Trash2, X, Loader2 } from 'lucide-react'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export const InvoiceCreateModal = ({ onClose, onSuccess }: Props) => {
  const [formData, setFormData] = useState<{
    invoice_date: string
    customer: string
    customer_address: string
    order: string | null
    gst_type: GstType | null
    notes: string
  }>({
    invoice_date: new Date().toISOString().split('T')[0],
    customer: '',
    customer_address: '',
    order: null,
    gst_type: null,
    notes: '',
  })

  const [items, setItems] = useState<CreateInvoiceItem[]>([
    { item_description: '', quantity: 1, unit: 'PCS', unit_price: 0, amount: 0 },
  ])

  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: customerService.getAll,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
  })

  const { data: settings } = useQuery({
    queryKey: ['invoiceSettings'],
    queryFn: settingsService.getInvoiceSettings,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateInvoiceRequest) => invoiceService.create(data),
    onSuccess: () => {
      onSuccess()
    },
    onError: (error: Error) => {
      alert(`Failed to create invoice: ${error.message}`)
    },
  })

  // Set default GST type from settings
  useEffect(() => {
    if (settings && settings.default_tax_type === 'GST' && !formData.gst_type) {
      setFormData((prev) => ({
        ...prev,
        gst_type: 'intrastate',
      }))
    }
  }, [settings, formData.gst_type])

  // Auto-fill customer address when customer is selected
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c: Customer) => c.id === customerId)
    setFormData({
      ...formData,
      customer: customerId,
      customer_address: customer?.address || '',
    })
    if (errors.customer) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.customer
        return newErrors
      })
    }
  }

  // Auto-populate items when order is selected
  const handleOrderChange = (orderId: string) => {
    const order = orders.find((o: Order) => o.id === orderId)
    if (order) {
      setFormData({
        ...formData,
        order: orderId,
        customer: order.customer,
        customer_address: '', // Will be filled by customer lookup
      })

      // Find customer address
      const customer = customers.find((c: Customer) => c.id === order.customer)
      if (customer) {
        setFormData((prev) => ({
          ...prev,
          customer_address: customer.address || '',
        }))
      }

      // Populate items from order
      if (order.items && order.items.length > 0) {
        const orderItems: CreateInvoiceItem[] = order.items.map((item) => ({
          item_description: `${item.template_details?.name || item.item_type}`,
          quantity: item.quantity,
          unit: 'PCS' as const,
          unit_price: item.unit_price || 0,
          amount: (item.unit_price || 0) * item.quantity,
          order_item: item.id,
        }))
        setItems(orderItems)
      }
    }
  }

  const addItem = () => {
    setItems([...items, { item_description: '', quantity: 1, unit: 'PCS', unit_price: 0, amount: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof CreateInvoiceItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-calculate amount when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : newItems[index].quantity
      const unitPrice = field === 'unit_price' ? Number(value) : newItems[index].unit_price
      newItems[index].amount = quantity * unitPrice
    }

    setItems(newItems)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  }

  const calculateTax = () => {
    const subtotal = calculateSubtotal()
    if (!settings || settings.default_tax_type !== 'GST') return 0

    if (formData.gst_type === 'intrastate') {
      const cgst = subtotal * (Number(settings.default_cgst_percent) / 100)
      const sgst = subtotal * (Number(settings.default_sgst_percent) / 100)
      return cgst + sgst
    } else if (formData.gst_type === 'interstate') {
      return subtotal * (Number(settings.default_igst_percent) / 100)
    }
    return 0
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.customer) {
      newErrors.customer = 'Customer is required'
    }
    if (!formData.invoice_date) {
      newErrors.invoice_date = 'Date is required'
    }
    if (!formData.customer_address) {
      newErrors.customer_address = 'Customer address is required'
    }
    if (items.length === 0 || items.every((i) => !i.item_description)) {
      newErrors.items = 'At least one item is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const invoiceData: CreateInvoiceRequest = {
      invoice_date: formData.invoice_date,
      customer: formData.customer,
      customer_address: formData.customer_address,
      order: formData.order,
      gst_type: formData.gst_type,
      cgst_percent: settings?.default_cgst_percent,
      sgst_percent: settings?.default_sgst_percent,
      igst_percent: settings?.default_igst_percent,
      notes: formData.notes,
      items: items.filter((i) => i.item_description),
    }

    createMutation.mutate(invoiceData)
  }

  const subtotal = calculateSubtotal()
  const tax = calculateTax()
  const total = calculateTotal()

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">Create Invoice</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={formData.customer} onValueChange={handleCustomerChange}>
                    <SelectTrigger className={errors.customer ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customer && <p className="text-xs text-red-500">{errors.customer}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Order (Optional)</Label>
                  <Select value={formData.order || ''} onValueChange={handleOrderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select order (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order: Order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.order_number} - {order.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Invoice Date *</Label>
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className={errors.invoice_date ? 'border-red-500' : ''}
                  />
                  {errors.invoice_date && <p className="text-xs text-red-500">{errors.invoice_date}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer Address *</Label>
                  <Textarea
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                    rows={3}
                    className={errors.customer_address ? 'border-red-500' : ''}
                    placeholder="Enter billing address"
                  />
                  {errors.customer_address && (
                    <p className="text-xs text-red-500">{errors.customer_address}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>GST Type</Label>
                  <Select
                    value={formData.gst_type || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gst_type: value as GstType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GST type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intrastate">Intrastate (CGST + SGST)</SelectItem>
                      <SelectItem value="interstate">Interstate (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-medium">Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {errors.items && <p className="text-xs text-red-500">{errors.items}</p>}

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Item Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">
                          Amount
                        </th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3">
                            <Input
                              placeholder="Item description"
                              value={item.item_description}
                              onChange={(e) => updateItem(index, 'item_description', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={item.unit}
                              onValueChange={(value) => updateItem(index, 'unit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PCS">PCS</SelectItem>
                                <SelectItem value="SET">SET</SelectItem>
                                <SelectItem value="PAIR">PAIR</SelectItem>
                                <SelectItem value="MTR">MTR</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={item.unit_price || ''}
                              onChange={(e) =>
                                updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount || ''}
                              onChange={(e) =>
                                updateItem(index, 'amount', parseFloat(e.target.value) || 0)
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                              className="text-gray-400 hover:text-red-500 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {settings?.default_tax_type === 'GST' && formData.gst_type && (
                    <>
                      {formData.gst_type === 'intrastate' ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              CGST ({settings.default_cgst_percent}%):
                            </span>
                            <span>₹{(subtotal * settings.default_cgst_percent / 100).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              SGST ({settings.default_sgst_percent}%):
                            </span>
                            <span>₹{(subtotal * settings.default_sgst_percent / 100).toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            IGST ({settings.default_igst_percent}%):
                          </span>
                          <span>₹{tax.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
