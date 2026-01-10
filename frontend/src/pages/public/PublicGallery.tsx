import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { publicGalleryService } from '@/services/gallery'
import type { PublicGalleryData, PublicGalleryItem, AvailabilityStatus } from '@/types/gallery'
import {
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Image as ImageIcon,
  Filter,
  Phone,
} from 'lucide-react'

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'Available',
  CUSTOM_ORDER_ONLY: 'Custom Order Only',
  NOT_ACCEPTING: 'Not Accepting Orders',
}

interface ImageModalProps {
  item: PublicGalleryItem
  onClose: () => void
  whatsappNumber?: string
  messageTemplate: string
  showPrices: boolean
}

const ImageModal = ({
  item,
  onClose,
  whatsappNumber,
  messageTemplate,
  showPrices,
}: ImageModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? item.images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === item.images.length - 1 ? 0 : prev + 1))
  }

  const handleEnquire = () => {
    if (!whatsappNumber) return
    const message = messageTemplate.replace('{item_title}', item.title)
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState<number | null>(null)
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd

    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext()
      else handlePrev()
    }
    setTouchStart(null)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-white/10 backdrop-blur rounded-full p-2 text-white hover:bg-white/20 transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Main image */}
      <div
        className="h-[70vh] flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={item.images[currentIndex]?.image_url}
          alt={item.title}
          className="max-h-full max-w-full object-contain"
        />

        {/* Navigation arrows - hidden on mobile */}
        {item.images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur rounded-full p-3 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNext}
              className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur rounded-full p-3 text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-white text-xl font-semibold">{item.title}</h2>
          
          {item.description && (
            <p className="text-white/80 text-sm mt-1 line-clamp-2">{item.description}</p>
          )}

          <div className="flex items-center gap-4 mt-3">
            {showPrices && item.price && (
              <span className="text-white text-lg font-bold">₹{item.price}</span>
            )}
            <span className="text-white/70 text-sm">
              {AVAILABILITY_LABELS[item.availability_status]}
            </span>
          </div>

          {/* Thumbnails */}
          {item.images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {item.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-12 w-12 flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${
                    idx === currentIndex ? 'border-white' : 'border-white/30'
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

          {/* WhatsApp button */}
          {whatsappNumber && (
            <button
              onClick={handleEnquire}
              className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              Enquire on WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const PublicGallery = () => {
  const { shopId } = useParams<{ shopId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category') || ''
  const [selectedItem, setSelectedItem] = useState<PublicGalleryItem | null>(null)

  const { data, isLoading, error } = useQuery<PublicGalleryData>({
    queryKey: ['public-gallery', shopId, categoryFilter],
    queryFn: () => publicGalleryService.getGallery(shopId!, categoryFilter || undefined),
    enabled: !!shopId,
  })

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId) {
      setSearchParams({ category: categoryId })
    } else {
      setSearchParams({})
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Gallery Not Available</h1>
          <p className="text-gray-500">This gallery is not publicly accessible</p>
        </div>
      </div>
    )
  }

  const filteredItems = categoryFilter
    ? data.items.filter((item) => item.category === categoryFilter)
    : data.items

  const featuredItems = filteredItems.filter((item) => item.is_featured)
  const regularItems = filteredItems.filter((item) => !item.is_featured)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {data.shop_logo && (
                <img
                  src={data.shop_logo}
                  alt={data.shop_name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="font-bold text-lg">{data.shop_name}</h1>
                <p className="text-xs text-muted-foreground">Gallery</p>
              </div>
            </div>

            {data.whatsapp_number && (
              <a
                href={`https://wa.me/${data.whatsapp_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Contact Us</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Category Filter */}
      {data.categories.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <button
                onClick={() => handleCategoryChange('')}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  !categoryFilter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                All
              </button>
              {data.categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    categoryFilter === category.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {category.name}
                  <span className="ml-1 text-xs opacity-70">({category.items_count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Items Found</h2>
            <p className="text-gray-500">
              {categoryFilter
                ? 'No items in this category yet'
                : 'No items have been added to the gallery yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Featured Items */}
            {featuredItems.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Featured</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {featuredItems.map((item) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      showPrices={data.show_prices}
                      onClick={() => setSelectedItem(item)}
                      featured
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Regular Items */}
            {regularItems.length > 0 && (
              <section>
                {featuredItems.length > 0 && (
                  <h2 className="text-lg font-semibold mb-4">All Items</h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {regularItems.map((item) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      showPrices={data.show_prices}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {data.shop_name}. All rights reserved.</p>
        </div>
      </footer>

      {/* Image Modal */}
      {selectedItem && (
        <ImageModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          whatsappNumber={data.whatsapp_number}
          messageTemplate={data.enquiry_message_template}
          showPrices={data.show_prices}
        />
      )}
    </div>
  )
}

interface GalleryCardProps {
  item: PublicGalleryItem
  showPrices: boolean
  onClick: () => void
  featured?: boolean
}

const GalleryCard = ({ item, showPrices, onClick, featured }: GalleryCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <div
      className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        featured ? 'ring-2 ring-yellow-400' : ''
      }`}
      onClick={onClick}
    >
      <div className="aspect-square bg-gray-100 relative">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        )}
        {item.primary_image_url ? (
          <img
            src={item.primary_image_url}
            alt={item.title}
            className={`h-full w-full object-cover transition-opacity ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Featured badge */}
        {featured && (
          <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
            Featured
          </span>
        )}

        {/* Image count */}
        {item.images.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
            +{item.images.length - 1}
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{item.title}</h3>
        {item.category_name && (
          <p className="text-xs text-muted-foreground truncate">{item.category_name}</p>
        )}
        {showPrices && item.price && (
          <p className="text-sm font-semibold mt-1">₹{item.price}</p>
        )}
      </div>
    </div>
  )
}
