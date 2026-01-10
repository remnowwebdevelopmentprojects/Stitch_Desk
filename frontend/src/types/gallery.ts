// Gallery Category types
export interface GalleryCategory {
  id: string
  name: string
  description?: string
  cover_image?: string
  cover_image_url?: string
  is_active: boolean
  display_order: number
  items_count: number
  created_at: string
  updated_at: string
}

export interface CreateGalleryCategoryRequest {
  name: string
  description?: string
  cover_image?: File
  is_active?: boolean
}

export interface UpdateGalleryCategoryRequest {
  name?: string
  description?: string
  cover_image?: File
  is_active?: boolean
}

// Gallery Image types
export interface GalleryImage {
  id: string
  image: string
  image_url: string
  display_order: number
  created_at: string
}

// Gallery Item types
export type AvailabilityStatus = 'AVAILABLE' | 'CUSTOM_ORDER_ONLY' | 'NOT_ACCEPTING'

export interface GalleryItem {
  id: string
  category?: string
  category_name?: string
  title: string
  description?: string
  price?: string
  availability_status: AvailabilityStatus
  is_featured: boolean
  is_published: boolean
  images: GalleryImage[]
  primary_image_url?: string
  created_at: string
  updated_at: string
}

export interface CreateGalleryItemRequest {
  category?: string
  title: string
  description?: string
  price?: string
  availability_status?: AvailabilityStatus
  is_featured?: boolean
  is_published?: boolean
  images?: File[]
}

export interface UpdateGalleryItemRequest {
  category?: string
  title?: string
  description?: string
  price?: string
  availability_status?: AvailabilityStatus
  is_featured?: boolean
  is_published?: boolean
  new_images?: File[]
}

// Gallery Settings types
export interface GallerySettings {
  id: string
  is_public_enabled: boolean
  show_prices: boolean
  whatsapp_number?: string
  enquiry_message_template: string
  public_category_ids: string[]
  gallery_url: string
  created_at: string
  updated_at: string
}

export interface UpdateGallerySettingsRequest {
  is_public_enabled?: boolean
  show_prices?: boolean
  whatsapp_number?: string
  enquiry_message_template?: string
  public_category_ids?: string[]
}

// Gallery Analytics types
export interface GalleryAnalytics {
  id: string
  date: string
  total_views: number
  unique_visitors: number
  item_views: Record<string, number>
  category_views: Record<string, number>
  created_at: string
}

export interface GalleryAnalyticsSummary {
  total_views: number
  total_unique_visitors: number
  daily_breakdown: {
    date: string
    total_views: number
    unique_visitors: number
  }[]
}

// Public Gallery types
export interface PublicGalleryCategory {
  id: string
  name: string
  description?: string
  cover_image_url?: string
  items_count: number
}

export interface PublicGalleryImage {
  id: string
  image_url: string
  display_order: number
}

export interface PublicGalleryItem {
  id: string
  category?: string
  category_name?: string
  title: string
  description?: string
  price?: string
  availability_status: AvailabilityStatus
  is_featured: boolean
  images: PublicGalleryImage[]
  primary_image_url?: string
}

export interface PublicGalleryData {
  shop_name: string
  shop_logo?: string
  whatsapp_number?: string
  enquiry_message_template: string
  show_prices: boolean
  categories: PublicGalleryCategory[]
  items: PublicGalleryItem[]
}

// Reorder request type
export interface ReorderRequest {
  orders: {
    id: string
    display_order: number
  }[]
}
