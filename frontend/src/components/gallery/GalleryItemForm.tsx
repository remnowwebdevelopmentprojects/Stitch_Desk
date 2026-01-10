import { useState, useRef } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { galleryItemService, galleryCategoryService } from '@/services/gallery'
import type {
  GalleryItem,
  GalleryCategory,
  CreateGalleryItemRequest,
  AvailabilityStatus,
} from '@/types/gallery'
import { Plus, X, Loader2, Upload } from 'lucide-react'

interface GalleryItemFormProps {
  item?: GalleryItem
  onSuccess: () => void
  trigger?: React.ReactNode
  categoryId?: string
}

const AVAILABILITY_OPTIONS: { value: AvailabilityStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'CUSTOM_ORDER_ONLY', label: 'Custom Order Only' },
  { value: 'NOT_ACCEPTING', label: 'Not Accepting Orders' },
]

export const GalleryItemForm = ({ item, onSuccess, trigger, categoryId }: GalleryItemFormProps) => {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(item?.title || '')
  const [category, setCategory] = useState(item?.category || categoryId || '')
  const [description, setDescription] = useState(item?.description || '')
  const [price, setPrice] = useState(item?.price || '')
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(
    item?.availability_status || 'AVAILABLE'
  )
  const [isFeatured, setIsFeatured] = useState(item?.is_featured || false)
  const [isPublished, setIsPublished] = useState(item?.is_published ?? true)
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [existingImages, setExistingImages] = useState(item?.images || [])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: categories = [] } = useQuery<GalleryCategory[]>({
    queryKey: ['gallery-categories'],
    queryFn: galleryCategoryService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateGalleryItemRequest) => {
      console.log('🚀 Calling API to create gallery item')
      return galleryItemService.create(data)
    },
    onSuccess: async (result) => {
      console.log('✅ Item created successfully:', result)
      queryClient.invalidateQueries({ queryKey: ['gallery-items'] })
      queryClient.invalidateQueries({ queryKey: ['gallery-categories'] })
      resetForm()
      setOpen(false)
      onSuccess()
    },
    onError: (error) => {
      console.error('❌ Failed to create item:', error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateGalleryItemRequest }) => {
      // Delete images marked for deletion
      for (const imageId of imagesToDelete) {
        await galleryItemService.deleteImage(id, imageId)
      }
      
      // Add new images
      if (images.length > 0) {
        await galleryItemService.addImages(id, images.map((i) => i.file))
      }
      
      // Update item data (without images)
      const { images: _, ...updateData } = data
      return galleryItemService.update(id, updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-items'] })
      queryClient.invalidateQueries({ queryKey: ['gallery-categories'] })
      setOpen(false)
      onSuccess()
    },
  })

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPrice('')
    setCategory(categoryId || '')
    setAvailabilityStatus('AVAILABLE')
    setIsFeatured(false)
    setIsPublished(true)
    setImages([])
    setExistingImages([])
    setImagesToDelete([])
  }

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 handleImageAdd triggered')
    const files = e.target.files
    console.log('📁 Files selected:', files)
    
    if (!files || files.length === 0) {
      console.log('❌ No files selected')
      return
    }

    console.log('📊 Files count:', files.length)
    console.log('📊 Current images:', images.length)
    console.log('📊 Existing images:', existingImages.length)
    console.log('📊 Images to delete:', imagesToDelete.length)

    const totalImages = existingImages.length - imagesToDelete.length + images.length + files.length
    console.log('📊 Total images will be:', totalImages)
    
    if (totalImages > 10) {
      console.log('❌ Exceeds 10 image limit')
      alert('Maximum 10 images allowed per item')
      return
    }

    const newImages: { file: File; preview: string }[] = []
    let processedCount = 0
    const totalFiles = files.length // Capture length before async operations

    console.log('🔄 Starting to process files...')
    
    Array.from(files).forEach((file, index) => {
      console.log(`📄 Processing file ${index + 1}/${totalFiles}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)
      
      if (file.size > 5 * 1024 * 1024) {
        console.log(`❌ File ${file.name} exceeds 5MB limit`)
        alert(`"${file.name}" exceeds 5MB limit`)
        processedCount++
        if (processedCount === totalFiles && newImages.length > 0) {
          console.log('✅ All files processed (with size errors), updating state with:', newImages.length, 'images')
          setImages((prev) => [...prev, ...newImages])
        }
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        console.log(`✅ File ${index + 1} read successfully: ${file.name}`)
        newImages.push({ file, preview: reader.result as string })
        processedCount++
        
        console.log(`📊 Processed: ${processedCount}/${totalFiles}, Valid images: ${newImages.length}`)
        console.log(`🔍 Condition check: processedCount (${processedCount}) === totalFiles (${totalFiles})? ${processedCount === totalFiles}`)
        console.log(`🔍 Condition check: newImages.length (${newImages.length}) > 0? ${newImages.length > 0}`)
        console.log(`🔍 Both conditions met? ${processedCount === totalFiles && newImages.length > 0}`)
        
        // Update state when all files are processed
        if (processedCount === totalFiles && newImages.length > 0) {
          console.log('✅ All files processed successfully, updating state with:', newImages.length, 'images')
          console.log('🖼️ New images array:', newImages)
          setImages((prev) => {
            console.log('📊 Previous images:', prev.length)
            const updated = [...prev, ...newImages]
            console.log('📊 Updated images:', updated.length)
            return updated
          })
        } else {
          console.log('❌ Condition not met, NOT updating state')
        }
      }
      reader.onerror = () => {
        console.error(`❌ Failed to read file: ${file.name}`)
        processedCount++
        if (processedCount === totalFiles && newImages.length > 0) {
          console.log('⚠️ All files processed (with read errors), updating state with:', newImages.length, 'images')
          setImages((prev) => [...prev, ...newImages])
        }
      }
      
      console.log(`📖 Starting to read file ${index + 1}: ${file.name}`)
      reader.readAsDataURL(file)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      console.log('🔄 File input reset')
    }
  }

  const handleRemoveNewImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingImage = (imageId: string) => {
    setImagesToDelete((prev) => [...prev, imageId])
  }

  const handleRestoreImage = (imageId: string) => {
    setImagesToDelete((prev) => prev.filter((id) => id !== imageId))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    console.log('📝 Form submitted')
    console.log('📊 Current images state:', images)
    console.log('📊 Images length:', images.length)

    const data: CreateGalleryItemRequest = {
      title,
      description: description || undefined,
      price: price || undefined,
      category: category || undefined,
      availability_status: availabilityStatus,
      is_featured: isFeatured,
      is_published: isPublished,
      images: images.length > 0 ? images.map((i) => i.file) : undefined,
    }

    console.log('📦 Form data being sent:', {
      ...data,
      images: data.images ? `${data.images.length} images` : 'no images'
    })

    if (item) {
      console.log('🔄 Updating existing item:', item.id)
      updateMutation.mutate({ id: item.id, data })
    } else {
      console.log('➕ Creating new item')
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const activeExistingImages = existingImages.filter((img) => !imagesToDelete.includes(img.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Gallery Item' : 'Add New Gallery Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Bridal Lehenga"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category || 'none'} onValueChange={(val) => setCategory(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories
                    .filter((c) => c.is_active)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this item..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (optional)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">Availability</Label>
              <Select
                value={availabilityStatus}
                onValueChange={(v) => setAvailabilityStatus(v as AvailabilityStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Featured item</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Published (visible in gallery)</span>
            </label>
          </div>

          <div className="space-y-2">
            <Label>Images (max 10)</Label>
            
            {/* Existing images */}
            {existingImages.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-2">
                {existingImages.map((img) => {
                  const isDeleted = imagesToDelete.includes(img.id)
                  return (
                    <div
                      key={img.id}
                      className={`relative group aspect-square rounded-lg overflow-hidden border ${
                        isDeleted ? 'opacity-40' : ''
                      }`}
                    >
                      <img
                        src={img.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          isDeleted
                            ? handleRestoreImage(img.id)
                            : handleRemoveExistingImage(img.id)
                        }
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isDeleted ? (
                          <span className="text-white text-xs">Restore</span>
                        ) : (
                          <X className="h-5 w-5 text-white" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* New images */}
            {images.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-2">
                {images.map((img, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-green-500"
                  >
                    <img
                      src={img.preview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                      New
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(index)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload images (max 1MB each after compression)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeExistingImages.length + images.length}/10 images
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageAdd}
              className="hidden"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {item ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
