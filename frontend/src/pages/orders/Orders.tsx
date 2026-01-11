import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'
import { OrderCreateModal } from '@/components/orders/OrderCreateModal'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { OrderEditModal } from '@/components/orders/OrderEditModal'
import { OrderMaterialsModal } from '@/components/inventory'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/orders'
import { Plus, Eye, Pencil, Search, Filter, Loader2, Package } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OrderStatus } from '@/types'

export const Orders = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [materialsOrderId, setMaterialsOrderId] = useState<string | null>(null)
  const [materialsOrderNumber, setMaterialsOrderNumber] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const queryClient = useQueryClient()

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        return await orderService.getAll()
      } catch (err) {
        console.error('Error fetching orders:', err)
        throw err
      }
    },
    retry: 1,
  })

  // Ensure orders is always an array
  const ordersList = Array.isArray(orders) ? orders : []

  // Filter orders based on search query and status
  const filteredOrders = ordersList.filter((order) => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'READY':
        return 'bg-blue-100 text-blue-800'
      case 'IN_STITCHING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PENDING':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-green-600'
      case 'PARTIAL':
        return 'text-yellow-600'
      case 'UNPAID':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const handleOrderCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground mt-2">
              Track and manage all orders
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number or customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 items-center sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'ALL')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_STITCHING">In Stitching</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
            <p className="text-destructive">Error loading orders. Please try again.</p>
            {error instanceof Error && (
              <p className="text-xs mt-2 text-gray-500">{error.message}</p>
            )}
          </div>
        ) : ordersList.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Create your first order to get started."
            action={
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            }
          />
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border shadow-sm">
            <p className="text-muted-foreground">No orders found matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{order.order_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                        <div className="text-sm text-gray-500">{order.customer_phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.order_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.delivery_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-medium capitalize ${getPaymentStatusColor(order.payment_status)}`}>
                        {order.payment_status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrderId(order.id)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMaterialsOrderId(order.id)
                            setMaterialsOrderNumber(order.order_number)
                          }}
                          title="Materials Used"
                        >
                          <Package className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingOrderId(order.id)}
                          title="Edit Order"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Order Modal */}
        <OrderCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleOrderCreated}
        />

        {/* Order Detail Modal */}
        <OrderDetailModal
          orderId={selectedOrderId}
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />

        {/* Order Edit Modal */}
        <OrderEditModal
          orderId={editingOrderId}
          isOpen={!!editingOrderId}
          onClose={() => setEditingOrderId(null)}
          onSuccess={handleOrderCreated}
        />

        {/* Order Materials Modal */}
        <OrderMaterialsModal
          orderId={materialsOrderId}
          orderNumber={materialsOrderNumber}
          isOpen={!!materialsOrderId}
          onClose={() => {
            setMaterialsOrderId(null)
            setMaterialsOrderNumber('')
          }}
        />
      </div>
    </Layout>
  )
}