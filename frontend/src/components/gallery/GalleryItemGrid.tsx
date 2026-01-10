import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { galleryItemService, galleryCategoryService } from '@/services/gallery'
import type { GalleryItem, GalleryCategory, AvailabilityStatus } from '@/types/gallery'
import { GalleryItemForm } from './GalleryItemForm'
import { Button } from '@/components/common/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  Loader2,
  Search,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const AVAILABILITY_LABELS: Record<AvailabilityStatus, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: 'bg-green-100 text-green-800' },
  CUSTOM_ORDER_ONLY: { label: 'Custom Order', color: 'bg-blue-100 text-blue-800' },
  NOT_ACCEPTING: { label: 'Not Accepting', color: 'bg-gray-100 text-gray-800' },
}

interface ImagePreviewModalProps {
  item: GalleryItem
  open: boolean
  onClose: () => void
}

const ImagePreviewModal = ({ item, open, onClose }: ImagePreviewModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!open || !item.images.length) return null

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? item.images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === item.images.length - 1 ? 0 : prev + 1))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black/50 rounded-full p-2 text-white hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative aspect-[4/3] bg-black">
            <img
              src={item.images[currentIndex]?.image_url}
              alt={item.title}
              className="h-full w-full object-contain"
            />

            {item.images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-2 text-white hover:bg-black/70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-2 text-white hover:bg-black/70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          <div className="p-4 bg-white">
            <h3 className="font-semibold text-lg">{item.title}</h3>
            {item.description && (
              <p className="text-muted-foreground mt-1">{item.description}</p>
            )}
            {item.price && (
              <p className="text-lg font-medium mt-2">₹{item.price}</p>
            )}

            {item.images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {item.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                      idx === currentIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface GalleryItemGridProps {
  categoryId?: string
}

export const GalleryItemGrid = ({ categoryId }: GalleryItemGridProps) => {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>(categoryId || '')
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null)

  // Update filter when categoryId prop changes
  useState(() => {
    if (categoryId) {
      setCategoryFilter(categoryId)
    }
  })

  const { data: items = [], isLoading: itemsLoading } = useQuery<GalleryItem[]>({
    queryKey: ['gallery-items', categoryFilter || categoryId],
    queryFn: () =>
      galleryItemService.getAll({
        category: categoryFilter || categoryId || undefined,
      }),
  })

  const { data: categories = [] } = useQuery<GalleryCategory[]>({
    queryKey: ['gallery-categories'],
    queryFn: galleryCategoryService.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: galleryItemService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-items'] })
      queryClient.invalidateQueries({ queryKey: ['gallery-categories'] })
    },
  })

  const toggleFeaturedMutation = useMutation({
    mutationFn: galleryItemService.toggleFeatured,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-items'] })
    },
  })

  const togglePublishedMutation = useMutation({
    mutationFn: galleryItemService.togglePublished,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-items'] })
    },
  })

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['gallery-items'] })
  }

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase()
    return (
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    )
  })

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-4 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {!categoryId && (
            <Select value={categoryFilter || 'all'} onValueChange={(val) => setCategoryFilter(val === 'all' ? '' : val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <GalleryItemForm onSuccess={handleSuccess} categoryId={categoryId} />
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No items found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter
              ? 'Try adjusting your filters'
              : 'Add your first gallery item to get started'}
          </p>
          {!searchQuery && !categoryFilter && (
            <GalleryItemForm onSuccess={handleSuccess} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              <div
                className="aspect-square bg-muted relative cursor-pointer"
                onClick={() => setPreviewItem(item)}
              >
                {item.primary_image_url ? (
                  <img
                    src={item.primary_image_url}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {item.is_featured && (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
                      Featured
                    </span>
                  )}
                  {!item.is_published && (
                    <span className="bg-gray-500 text-white text-xs px-2 py-0.5 rounded">
                      Draft
                    </span>
                  )}
                </div>

                {/* Image count badge */}
                {item.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                    {item.images.length} images
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium truncate">{item.title}</h4>
                    {item.category_name && (
                      <p className="text-xs text-muted-foreground">{item.category_name}</p>
                    )}
                  </div>
                  {item.price && (
                    <span className="text-sm font-medium">₹{item.price}</span>
                  )}
                </div>

                <div className="mt-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      AVAILABILITY_LABELS[item.availability_status].color
                    }`}
                  >
                    {AVAILABILITY_LABELS[item.availability_status].label}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleFeaturedMutation.mutate(item.id)}
                    title={item.is_featured ? 'Remove from featured' : 'Mark as featured'}
                  >
                    {item.is_featured ? (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => togglePublishedMutation.mutate(item.id)}
                    title={item.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {item.is_published ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  <GalleryItemForm
                    item={item}
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
                    onClick={() => handleDelete(item.id, item.title)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewItem && (
        <ImagePreviewModal
          item={previewItem}
          open={!!previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  )
}
