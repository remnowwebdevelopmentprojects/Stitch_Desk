import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/common/Button'
import { OrderCreateModal } from '@/components/orders/OrderCreateModal'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { OrderEditModal } from '@/components/orders/OrderEditModal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/orders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Eye, Pencil, Search, Filter } from 'lucide-react'
import { formatCurrency } from '@/utils/currency'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OrderStatus } from '@/types'

export const Orders = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
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
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        
        {isLoading ? (
          <div className="text-center py-12">Loading orders...</div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p>Error loading orders. Please try again.</p>
            {error instanceof Error && (
              <p className="text-xs mt-2">{error.message}</p>
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
          <EmptyState
            title="No orders found"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOrders.map((order) => (
              <Card 
                key={order.id} 
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{order.order_number}</CardTitle>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        order.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'READY'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'IN_STITCHING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Customer</span>
                      <span className="font-medium truncate ml-2">{order.customer_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span>{new Date(order.delivery_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Payment</span>
                      <span className="capitalize">{order.payment_status.toLowerCase()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditingOrderId(order.id)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
      </div>
    </Layout>
  )
}

