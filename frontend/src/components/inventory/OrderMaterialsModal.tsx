import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { inventoryItemService, orderMaterialService } from '@/services/inventory'
import { UNIT_LABELS } from '@/types/inventory'
import type { InventoryItemList, OrderMaterial, CreateOrderMaterial } from '@/types/inventory'
import { formatCurrency } from '@/utils/currency'
import { 
  Loader2, 
  Package, 
  Plus, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react'

interface OrderMaterialsModalProps {
  orderId: string | null
  orderNumber?: string
  isOpen: boolean
  onClose: () => void
}

export const OrderMaterialsModal = ({ orderId, orderNumber, isOpen, onClose }: OrderMaterialsModalProps) => {
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [pendingMaterials, setPendingMaterials] = useState<CreateOrderMaterial[]>([])

  // Fetch available inventory items
  const { data: inventoryItemsData, isLoading: itemsLoading } = useQuery<InventoryItemList[]>({
    queryKey: ['inventory-items'],
    queryFn: () => inventoryItemService.getAll(),
    enabled: isOpen,
  })
  const inventoryItems = Array.isArray(inventoryItemsData) ? inventoryItemsData : []

  // Fetch existing materials for this order
  const { data: existingMaterials, isLoading: materialsLoading, refetch } = useQuery({
    queryKey: ['order-materials', orderId],
    queryFn: () => orderMaterialService.getByOrder(orderId!),
    enabled: !!orderId && isOpen,
  })

  const addMutation = useMutation({
    mutationFn: (materials: CreateOrderMaterial[]) => 
      orderMaterialService.addToOrder(orderId!, { materials }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['order-materials', orderId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      
      if (data.errors && data.errors.length > 0) {
        alert(`Added ${data.materials.length} items. ${data.errors.length} failed.`)
      } else {
        alert('Materials added and stock deducted')
      }
      
      setPendingMaterials([])
      refetch()
    },
    onError: (error: any) => {
      alert(error.response?.data?.errors?.[0]?.error || 'Failed to add materials')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: orderMaterialService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-materials', orderId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      alert('Material removed and stock restored')
      refetch()
    },
    onError: () => {
      alert('Failed to remove material')
    }
  })

  const handleAddToPending = () => {
    if (!selectedItem || !quantity || parseFloat(quantity) <= 0) {
      alert('Please select an item and enter quantity')
      return
    }

    const item = inventoryItems.find(i => i.id === selectedItem)
    if (!item) return

    // Check if item already in pending
    if (pendingMaterials.some(m => m.inventory_item === selectedItem)) {
      alert('Item already added. Remove it first to change quantity.')
      return
    }

    // Check stock availability
    const requestedQty = parseFloat(quantity)
    if (requestedQty > item.current_stock) {
      alert(`Only ${item.current_stock} ${UNIT_LABELS[item.unit]} available`)
      return
    }

    setPendingMaterials([...pendingMaterials, {
      inventory_item: selectedItem,
      quantity: requestedQty,
      notes: notes,
    }])

    // Reset form
    setSelectedItem('')
    setQuantity('')
    setNotes('')
  }

  const handleRemoveFromPending = (itemId: string) => {
    setPendingMaterials(pendingMaterials.filter(m => m.inventory_item !== itemId))
  }

  const handleSubmit = () => {
    if (pendingMaterials.length === 0) {
      alert('No materials to add')
      return
    }
    addMutation.mutate(pendingMaterials)
  }

  const handleClose = () => {
    setPendingMaterials([])
    setSelectedItem('')
    setQuantity('')
    setNotes('')
    onClose()
  }

  const getItemDetails = (itemId: string) => {
    return inventoryItems.find(i => i.id === itemId)
  }

  const isLoading = itemsLoading || materialsLoading

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Materials Used {orderNumber && `- ${orderNumber}`}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add Material Form */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Add Material</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Select Item</Label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose inventory item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{item.name}</span>
                            <span className={`text-xs ml-2 ${item.is_low_stock ? 'text-red-500' : 'text-muted-foreground'}`}>
                              ({item.current_stock} {item.unit})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                    />
                    {selectedItem && (
                      <span className="text-sm text-muted-foreground w-16">
                        {getItemDetails(selectedItem)?.unit}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Used for collar"
                  />
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddToPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to List
              </Button>
            </div>

            {/* Pending Materials (to be submitted) */}
            {pendingMaterials.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Pending (not saved yet)
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {pendingMaterials.length} items
                  </span>
                </div>
                
                <div className="space-y-2 p-3 border-2 border-dashed border-yellow-200 rounded-lg bg-yellow-50">
                  {pendingMaterials.map((material) => {
                    const item = getItemDetails(material.inventory_item)
                    return (
                      <div
                        key={material.inventory_item}
                        className="flex items-center justify-between p-2 bg-white rounded border"
                      >
                        <div>
                          <p className="font-medium text-sm">{item?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {material.quantity} {item?.unit}
                            {material.notes && ` • ${material.notes}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromPending(material.inventory_item)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>

                <Button 
                  onClick={handleSubmit} 
                  disabled={addMutation.isPending}
                  className="w-full"
                >
                  {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save & Deduct Stock
                </Button>
              </div>
            )}

            {/* Existing Materials (already saved) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Saved Materials
                </h4>
                {existingMaterials && (
                  <span className="text-sm font-medium">
                    Total: {formatCurrency(existingMaterials.total_cost)}
                  </span>
                )}
              </div>

              {existingMaterials?.materials.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No materials added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {existingMaterials?.materials.map((material: OrderMaterial) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{material.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {material.quantity} {material.item_unit}
                          {material.unit_price && ` × ${formatCurrency(material.unit_price)}`}
                          {material.total_cost && ` = ${formatCurrency(material.total_cost)}`}
                        </p>
                        {material.notes && (
                          <p className="text-xs text-gray-400 mt-1">{material.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(material.id)}
                        disabled={deleteMutation.isPending}
                        title="Remove and restore stock"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
