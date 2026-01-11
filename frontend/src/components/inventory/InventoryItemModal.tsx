import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { inventoryItemService, inventoryCategoryService } from '@/services/inventory'
import { UNIT_OPTIONS } from '@/types/inventory'
import type { CreateInventoryItem, InventoryCategory, InventoryUnit } from '@/types/inventory'
import { Loader2, Plus } from 'lucide-react'
import { InventoryCategoryModal } from './InventoryCategoryModal'

interface InventoryItemModalProps {
  isOpen: boolean
  onClose: () => void
  editItem?: any // For edit mode
}

export const InventoryItemModal = ({ isOpen, onClose, editItem }: InventoryItemModalProps) => {
  const queryClient = useQueryClient()
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sku, setSku] = useState('')
  const [currentStock, setCurrentStock] = useState('')
  const [minimumStock, setMinimumStock] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<InventoryUnit>('PCS')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [error, setError] = useState('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  // Reset form when modal opens/closes or editItem changes
  useEffect(() => {
    if (isOpen && editItem) {
      setName(editItem.name || '')
      setDescription(editItem.description || '')
      setSku(editItem.sku || '')
      setCurrentStock(editItem.current_stock?.toString() || '0')
      setMinimumStock(editItem.minimum_stock?.toString() || '0')
      setNotes(editItem.notes || '')
      setSelectedUnit(editItem.unit || 'PCS')
      setSelectedCategory(editItem.category || 'NONE')
    } else if (isOpen && !editItem) {
      resetForm()
    }
  }, [editItem, isOpen])

  const { data: categoriesData } = useQuery<InventoryCategory[]>({
    queryKey: ['inventory-categories'],
    queryFn: inventoryCategoryService.getAll,
    enabled: isOpen,
  })
  const categories = Array.isArray(categoriesData) ? categoriesData : []

  const mutation = useMutation({
    mutationFn: (data: CreateInventoryItem) => {
      if (editItem) {
        return inventoryItemService.update(editItem.id, data)
      }
      return inventoryItemService.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      alert(editItem ? 'Item updated successfully' : 'Item created successfully')
      handleClose()
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to save item')
    }
  })

  const resetForm = () => {
    setName('')
    setDescription('')
    setSku('')
    setCurrentStock('0')
    setMinimumStock('0')
    setNotes('')
    setSelectedUnit('PCS')
    setSelectedCategory('NONE')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleCategoryChange = (value: string) => {
    if (value === 'ADD_NEW') {
      setShowCategoryModal(true)
    } else {
      setSelectedCategory(value)
    }
  }

  const handleCategoryModalClose = () => {
    setShowCategoryModal(false)
    // Refresh categories after closing category modal
    queryClient.invalidateQueries({ queryKey: ['inventory-categories'] })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const data: CreateInventoryItem = {
      name: name.trim(),
      description: description.trim() || undefined,
      sku: sku.trim() || undefined,
      current_stock: parseFloat(currentStock) || 0,
      minimum_stock: parseFloat(minimumStock) || 0,
      notes: notes.trim() || undefined,
      unit: selectedUnit,
      category: selectedCategory && selectedCategory !== 'NONE' ? selectedCategory : undefined,
    }

    mutation.mutate(data)
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Blue Cotton Fabric"
              />
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select key={`category-${editItem?.id || 'new'}`} value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No Category</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                  <SelectItem value="ADD_NEW" className="text-primary font-medium">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Category
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select key={`unit-${editItem?.id || 'new'}`} value={selectedUnit} onValueChange={(v) => setSelectedUnit(v as InventoryUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="current_stock">Initial Stock</Label>
              <Input
                id="current_stock"
                type="number"
                step="0.01"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="minimum_stock">Minimum Stock</Label>
              <Input
                id="minimum_stock"
                type="number"
                step="0.01"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="sku">SKU / Code</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Item description..."
                rows={2}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <InventoryCategoryModal
      isOpen={showCategoryModal}
      onClose={handleCategoryModalClose}
    />
  </>
  )
}
