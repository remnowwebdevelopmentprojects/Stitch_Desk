import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { galleryCategoryService } from '@/services/gallery'
import type { GalleryCategory, CreateGalleryCategoryRequest } from '@/types/gallery'
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Loader2,
  FolderOpen,
} from 'lucide-react'

interface CategoryFormProps {
  category?: GalleryCategory
  onSuccess: () => void
  trigger?: React.ReactNode
}

export const CategoryForm = ({ category, onSuccess, trigger }: CategoryFormProps) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(
    category?.cover_image_url || null
  )

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: CreateGalleryCategoryRequest) => galleryCategoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-categories'] })
      resetForm()
      setOpen(false)
      onSuccess()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: CreateGalleryCategoryRequest }) =>
      galleryCategoryService.update(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-categories'] })
      setOpen(false)
      onSuccess()
    },
  })

  const resetForm = () => {
    setName('')
    setDescription('')
    setCoverImage(null)
    setCoverImagePreview(null)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      setCoverImage(file)
      const reader = new FileReader()
      reader.onloadend = () => setCoverImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: CreateGalleryCategoryRequest = {
      name,
      description: description || undefined,
      cover_image: coverImage || undefined,
      is_active: true, // Default to active
    }

    if (category) {
      updateMutation.mutate({ id: category.id, updates: data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Bridal Collection"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cover Image</Label>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => document.getElementById('cover-image-input')?.click()}
            >
              {coverImagePreview ? (
                <img
                  src={coverImagePreview}
                  alt="Cover preview"
                  className="max-h-32 mx-auto rounded"
                />
              ) : (
                <div className="py-4">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload cover image</p>
                </div>
              )}
            </div>
            <input
              id="cover-image-input"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {category ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const CategoryManager = () => {
  const queryClient = useQueryClient()

  const { data: categories = [], isLoading } = useQuery<GalleryCategory[]>({
    queryKey: ['gallery-categories'],
    queryFn: galleryCategoryService.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: galleryCategoryService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-categories'] })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: galleryCategoryService.toggleActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-categories'] })
    },
  })

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleSuccess = () => {
    // Callback for form success
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Organize your gallery items into categories
        </p>
        <CategoryForm onSuccess={handleSuccess} />
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No categories yet</h3>
          <p className="text-muted-foreground mb-4">
            Create categories to organize your gallery items
          </p>
          <CategoryForm onSuccess={handleSuccess} />
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              
              <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {category.cover_image_url ? (
                  <img
                    src={category.cover_image_url}
                    alt={category.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{category.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {category.items_count} {category.items_count === 1 ? 'item' : 'items'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleActiveMutation.mutate(category.id)}
                  title={category.is_active ? 'Hide category' : 'Show category'}
                >
                  {category.is_active ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>

                <CategoryForm
                  category={category}
                  onSuccess={handleSuccess}
                  trigger={
                    <Button size="sm" variant="ghost">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(category.id, category.name)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
