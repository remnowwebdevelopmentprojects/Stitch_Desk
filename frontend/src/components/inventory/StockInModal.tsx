import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { inventoryItemService } from '@/services/inventory'
import { UNIT_LABELS } from '@/types/inventory'
import type { InventoryItem, StockInRequest } from '@/types/inventory'
import { Loader2, Package, Plus } from 'lucide-react'

interface StockInModalProps {
  itemId: string | null
  isOpen: boolean
  onClose: () => void
}

export const StockInModal = ({ itemId, isOpen, onClose }: StockInModalProps) => {
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const { data: item, isLoading } = useQuery<InventoryItem>({
    queryKey: ['inventory-item', itemId],
    queryFn: () => inventoryItemService.getById(itemId!),
    enabled: !!itemId && isOpen,
  })

  const mutation = useMutation({
    mutationFn: (data: StockInRequest) => inventoryItemService.stockIn(itemId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-item', itemId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-item-history', itemId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      alert(data.message)
      handleClose()
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to add stock')
    }
  })

  const resetForm = () => {
    setQuantity('')
    setSupplierName('')
    setNotes('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const qty = parseFloat(quantity)
    if (!quantity || qty <= 0) {
      setError('Quantity is required and must be greater than 0')
      return
    }

    mutation.mutate({
      quantity: qty,
      supplier_name: supplierName,
      notes: notes,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Stock
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : item ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Current: {item.current_stock} {UNIT_LABELS[item.unit]}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity to Add *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-20">{UNIT_LABELS[item.unit]}</span>
              </div>
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>

            <div>
              <Label htmlFor="supplier_name">Supplier Name</Label>
              <Input
                id="supplier_name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Stock
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Item not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
