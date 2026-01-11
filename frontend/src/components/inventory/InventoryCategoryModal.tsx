import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { inventoryCategoryService } from '@/services/inventory'
import { UNIT_OPTIONS } from '@/types/inventory'
import type { CreateInventoryCategory, InventoryCategory, InventoryUnit } from '@/types/inventory'
import { Loader2, Pencil, Trash2, FolderOpen } from 'lucide-react'

interface InventoryCategoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export const InventoryCategoryModal = ({ isOpen, onClose }: InventoryCategoryModalProps) => {
  const queryClient = useQueryClient()
  const [isAddMode, setIsAddMode] = useState(false)
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<InventoryUnit>('PCS')
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const { data: categoriesData, isLoading } = useQuery<InventoryCategory[]>({
    queryKey: ['inventory-categories'],
    queryFn: inventoryCategoryService.getAll,
    enabled: isOpen,
  })
  const categories = Array.isArray(categoriesData) ? categoriesData : []

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('Categories Data:', categoriesData)
      console.log('Is Array:', Array.isArray(categoriesData))
      console.log('Categories:', categories)
    }
  }, [categoriesData, categories, isOpen])

  const createMutation = useMutation({
    mutationFn: (data: CreateInventoryCategory) => {
      if (editingCategory) {
        return inventoryCategoryService.update(editingCategory.id, data)
      }
      return inventoryCategoryService.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-categories'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      alert(editingCategory ? 'Category updated' : 'Category created')
      resetForm()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.name?.[0] || error.response?.data?.message || 'Failed to save category'
      alert(errorMessage)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: inventoryCategoryService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-categories'] })
      alert('Category deleted')
    },
    onError: () => {
      alert('Failed to delete category')
    }
  })

  const resetForm = () => {
    setName('')
    setDescription('')
    setSelectedUnit('PCS')
    setIsAddMode(false)
    setEditingCategory(null)
    setError('')
  }

  const handleEdit = (category: InventoryCategory) => {
    setEditingCategory(category)
    setName(category.name)
    setDescription(category.description || '')
    setSelectedUnit(category.default_unit)
    setIsAddMode(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      default_unit: selectedUnit,
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        {isAddMode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Fabrics"
              />
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>

            <div>
              <Label htmlFor="default_unit">Default Unit</Label>
              <Select value={selectedUnit} onValueChange={(v) => setSelectedUnit(v as InventoryUnit)}>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCategory ? 'Update' : 'Add Category'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <Button onClick={() => setIsAddMode(true)} className="w-full">
              Add New Category
            </Button>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No categories yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {categories.map(category => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.items_count} items • Default: {category.default_unit}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(category.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
