  import { useQuery } from '@tanstack/react-query'
import { orderService } from '@/services/orders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/common/Button'
import { X } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'

interface OrderDetailModalProps {
  orderId: string | null
  isOpen: boolean
  onClose: () => void
}

export const OrderDetailModal = ({ orderId, isOpen, onClose }: OrderDetailModalProps) => {
  const { data: order, isLoading } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => orderService.getById(orderId!),
    enabled: !!orderId && isOpen,
  })

  if (!isOpen || !orderId) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl">Order Details</CardTitle>
              {order && (
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{order.customer_name}</span> • {order.customer_phone}
                  </p>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-12">Loading order details...</div>
          ) : order ? (
            <div className="space-y-6">
              {/* Top Section - Order Info and Pricing/Payment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Info */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Order Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Order Number</p>
                      <p className="text-sm font-bold">{order.order_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          order.status === 'DELIVERED'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'READY'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'IN_STITCHING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Order Date</p>
                      <p className="text-sm">{new Date(order.order_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Delivery Date</p>
                      <p className="text-sm">{new Date(order.delivery_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Summary and Payment */}
                <div className="space-y-4">
                  {/* Pricing Summary */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Pricing Summary</h3>
                    <div className="space-y-2 border rounded-lg p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax (18%):</span>
                        <span>{formatCurrency(order.tax)}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold border-t pt-2 mt-2">
                        <span>Total Amount:</span>
                        <span>{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Payment Information</h3>
                    <div className="space-y-2 border rounded-lg p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Status:</span>
                        <span className={`font-medium ${
                          order.payment_status === 'PAID' ? 'text-green-600' :
                          order.payment_status === 'PARTIAL' ? 'text-yellow-600' : 'text-red-600'
                        }`}>{order.payment_status}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount Paid:</span>
                        <span>{formatCurrency(order.amount_paid)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Balance:</span>
                        <span className="font-medium">{formatCurrency(order.balance_amount)}</span>
                      </div>
                      {order.payment_method && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Payment Method:</span>
                          <span>{order.payment_method}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              {order.items && order.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Order Items ({order.items.length})</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium">S.No</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-medium">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {order.items.map((item, index) => {
                          const amount = item.quantity * (item.unit_price || 0)
                          return (
                            <tr key={item.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm">{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{item.item_type}</span>
                                  {item.sample_given && (
                                    <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                      Sample
                                    </span>
                                  )}
                                </div>
                                {item.template_details && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{item.template_details.name}</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unit_price || 0)}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(amount)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Measurements Section */}
              {order.items && order.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Measurements</h3>
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold">Item {index + 1}: {item.item_type}</span>
                          {item.template_details && (
                            <span className="text-xs text-muted-foreground">({item.template_details.name})</span>
                          )}
                        </div>
                        {item.measurements && Object.keys(item.measurements).length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {Object.entries(item.measurements).map(([point, value]) => {
                              const field = item.template_details?.fields?.find((f) => f.point === point)
                              const label = field?.label || point
                              const unit = field?.unit || ''
                              return (
                                <div key={point} className="bg-muted/30 px-3 py-2 rounded">
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="text-sm font-medium">{value} {unit}</p>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No measurements recorded</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground border rounded-lg p-3">{order.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Order not found</div>
          )}
        </CardContent>

        <div className="border-t p-3 sm:p-4 flex justify-end flex-shrink-0">
          <Button onClick={onClose} size="sm">Close</Button>
        </div>
      </Card>
    </div>
  )
}

