import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/common/Button'
import { inventoryItemService } from '@/services/inventory'
import { UNIT_LABELS } from '@/types/inventory'
import type { InventoryItem, StockHistory } from '@/types/inventory'
import { formatCurrency } from '@/utils/currency'
import { 
  Loader2, 
  Package, 
  AlertTriangle, 
  History, 
  Pencil, 
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InventoryItemModal } from './InventoryItemModal'

interface InventoryItemDetailModalProps {
  itemId: string | null
  isOpen: boolean
  onClose: () => void
}

export const InventoryItemDetailModal = ({ itemId, isOpen, onClose }: InventoryItemDetailModalProps) => {
  const queryClient = useQueryClient()
  const [isEditMode, setIsEditMode] = useState(false)

  const { data: item, isLoading } = useQuery<InventoryItem>({
    queryKey: ['inventory-item', itemId],
    queryFn: () => inventoryItemService.getById(itemId!),
    enabled: !!itemId && isOpen,
  })

  const { data: history = [], isLoading: historyLoading } = useQuery<StockHistory[]>({
    queryKey: ['inventory-item-history', itemId],
    queryFn: () => inventoryItemService.getHistory(itemId!),
    enabled: !!itemId && isOpen,
  })

  const deleteMutation = useMutation({
    mutationFn: inventoryItemService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      alert('Item deleted')
      onClose()
    },
    onError: () => {
      alert('Failed to delete item')
    }
  })

  const handleDelete = () => {
    if (item && confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(item.id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowDownCircle className="w-4 h-4 text-green-500" />
      case 'OUT':
        return <ArrowUpCircle className="w-4 h-4 text-red-500" />
      case 'ADJUSTMENT':
        return <RefreshCw className="w-4 h-4 text-blue-500" />
      default:
        return null
    }
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      PURCHASE: 'Purchase/Restock',
      ORDER_USAGE: 'Used in Order',
      DAMAGED: 'Damaged/Waste',
      RETURNED: 'Customer Return',
      MANUAL_ADJUSTMENT: 'Manual Adjustment',
      INITIAL_STOCK: 'Initial Stock',
      ORDER_CANCELLED: 'Order Cancelled',
    }
    return labels[reason] || reason
  }

  if (isEditMode && item) {
    return (
      <InventoryItemModal
        isOpen={true}
        onClose={() => {
          setIsEditMode(false)
          queryClient.invalidateQueries({ queryKey: ['inventory-item', itemId] })
        }}
        editItem={item}
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Item Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : item ? (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">Stock History</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{item.name}</h3>
                  {item.category_name && (
                    <p className="text-sm text-muted-foreground">{item.category_name}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Stock Status */}
              <div className={`p-4 rounded-lg ${item.is_low_stock ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                    <p className={`text-3xl font-bold ${item.is_low_stock ? 'text-red-600' : 'text-green-600'}`}>
                      {item.current_stock} <span className="text-lg">{UNIT_LABELS[item.unit]}</span>
                    </p>
                  </div>
                  {item.is_low_stock && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm font-medium">Low Stock!</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Minimum threshold: {item.minimum_stock} {UNIT_LABELS[item.unit]}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {item.sku && (
                  <div>
                    <p className="text-sm text-muted-foreground">SKU / Code</p>
                    <p className="font-medium">{item.sku}</p>
                  </div>
                )}
                {item.purchase_price && (
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Price</p>
                    <p className="font-medium">{formatCurrency(item.purchase_price)}</p>
                  </div>
                )}
                {item.selling_price && (
                  <div>
                    <p className="text-sm text-muted-foreground">Selling Price</p>
                    <p className="font-medium">{formatCurrency(item.selling_price)}</p>
                  </div>
                )}
                {item.purchase_price && (
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Value</p>
                    <p className="font-medium">{formatCurrency(item.current_stock * item.purchase_price)}</p>
                  </div>
                )}
              </div>

              {item.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1">{item.description}</p>
                </div>
              )}

              {item.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="mt-1">{item.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No stock history yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="mt-1">{getTransactionIcon(entry.transaction_type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">
                            {entry.transaction_type === 'IN' ? '+' : entry.transaction_type === 'OUT' ? '-' : ''}
                            {entry.quantity} {UNIT_LABELS[item.unit]}
                          </p>
                          <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{getReasonLabel(entry.reason)}</p>
                        {entry.order_number && (
                          <p className="text-xs text-blue-600">Order: {entry.order_number}</p>
                        )}
                        {entry.supplier_name && (
                          <p className="text-xs text-gray-500">Supplier: {entry.supplier_name}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Stock: {entry.stock_before} → {entry.stock_after}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Item not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
