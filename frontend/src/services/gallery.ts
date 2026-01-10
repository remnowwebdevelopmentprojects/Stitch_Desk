import { apiClient } from './api'
import type {
  GalleryCategory,
  GalleryItem,
  GalleryImage,
  GallerySettings,
  GalleryAnalyticsSummary,
  CreateGalleryCategoryRequest,
  UpdateGalleryCategoryRequest,
  CreateGalleryItemRequest,
  UpdateGalleryItemRequest,
  UpdateGallerySettingsRequest,
  ReorderRequest,
  PublicGalleryData,
  PublicGalleryItem,
} from '../types/gallery'
import type { PaginatedResponse } from '../types'

// Helper to create FormData from object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createFormData = (data: any): FormData => {
  const formData = new FormData()
  
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    
    if (key === 'images' && Array.isArray(value)) {
      value.forEach((file: File) => {
        formData.append('images', file)
      })
    } else if (key === 'new_images' && Array.isArray(value)) {
      value.forEach((file: File) => {
        formData.append('new_images', file)
      })
    } else if (value instanceof File) {
      formData.append(key, value)
    } else if (typeof value === 'boolean') {
      formData.append(key, value ? 'true' : 'false')
    } else {
      formData.append(key, String(value))
    }
  })
  
  return formData
}

// Category Service
export const galleryCategoryService = {
  getAll: async (): Promise<GalleryCategory[]> => {
    const response = await apiClient.get<PaginatedResponse<GalleryCategory> | GalleryCategory[]>(
      '/gallery/categories/'
    )
    if ('results' in response.data) {
      return response.data.results
    }
    return response.data
  },

  getById: async (id: string): Promise<GalleryCategory> => {
    const response = await apiClient.get<GalleryCategory>(`/gallery/categories/${id}/`)
    return response.data
  },

  create: async (data: CreateGalleryCategoryRequest): Promise<GalleryCategory> => {
    const formData = createFormData(data)
    const response = await apiClient.post<GalleryCategory>('/gallery/categories/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  update: async (id: string, data: UpdateGalleryCategoryRequest): Promise<GalleryCategory> => {
    const formData = createFormData(data)
    const response = await apiClient.patch<GalleryCategory>(`/gallery/categories/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/gallery/categories/${id}/`)
  },

  reorder: async (orders: ReorderRequest['orders']): Promise<void> => {
    await apiClient.post('/gallery/categories/reorder/', { orders })
  },

  toggleActive: async (id: string): Promise<GalleryCategory> => {
    const response = await apiClient.post<GalleryCategory>(`/gallery/categories/${id}/toggle_active/`)
    return response.data
  },
}

// Gallery Item Service
export const galleryItemService = {
  getAll: async (params?: {
    category?: string
    is_published?: boolean
    is_featured?: boolean
  }): Promise<GalleryItem[]> => {
    const queryParams = new URLSearchParams()
    if (params?.category) queryParams.append('category', params.category)
    if (params?.is_published !== undefined) queryParams.append('is_published', String(params.is_published))
    if (params?.is_featured !== undefined) queryParams.append('is_featured', String(params.is_featured))
    
    const url = `/gallery/items/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await apiClient.get<PaginatedResponse<GalleryItem> | GalleryItem[]>(url)
    
    if ('results' in response.data) {
      return response.data.results
    }
    return response.data
  },

  getById: async (id: string): Promise<GalleryItem> => {
    const response = await apiClient.get<GalleryItem>(`/gallery/items/${id}/`)
    return response.data
  },

  create: async (data: CreateGalleryItemRequest): Promise<GalleryItem> => {
    const formData = createFormData(data)
    const response = await apiClient.post<GalleryItem>('/gallery/items/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  update: async (id: string, data: UpdateGalleryItemRequest): Promise<GalleryItem> => {
    const formData = createFormData(data)
    const response = await apiClient.patch<GalleryItem>(`/gallery/items/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/gallery/items/${id}/`)
  },

  toggleFeatured: async (id: string): Promise<GalleryItem> => {
    const response = await apiClient.post<GalleryItem>(`/gallery/items/${id}/toggle_featured/`)
    return response.data
  },

  togglePublished: async (id: string): Promise<GalleryItem> => {
    const response = await apiClient.post<GalleryItem>(`/gallery/items/${id}/toggle_published/`)
    return response.data
  },

  addImages: async (id: string, images: File[]): Promise<GalleryImage[]> => {
    const formData = new FormData()
    images.forEach((file) => {
      formData.append('images', file)
    })
    const response = await apiClient.post<GalleryImage[]>(
      `/gallery/items/${id}/add_images/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },

  reorderImages: async (id: string, orders: ReorderRequest['orders']): Promise<void> => {
    await apiClient.post(`/gallery/items/${id}/reorder_images/`, { orders })
  },

  deleteImage: async (itemId: string, imageId: string): Promise<void> => {
    await apiClient.delete(`/gallery/items/${itemId}/images/${imageId}/`)
  },
}

// Gallery Settings Service
export const gallerySettingsService = {
  get: async (): Promise<GallerySettings> => {
    const response = await apiClient.get<GallerySettings>('/gallery/settings/')
    return response.data
  },

  update: async (data: UpdateGallerySettingsRequest): Promise<GallerySettings> => {
    const response = await apiClient.patch<GallerySettings>('/gallery/settings/', data)
    return response.data
  },
}

// Gallery Analytics Service
export const galleryAnalyticsService = {
  getSummary: async (): Promise<GalleryAnalyticsSummary> => {
    const response = await apiClient.get<GalleryAnalyticsSummary>('/gallery/analytics/summary/')
    return response.data
  },
}

// Public Gallery Service (no auth required)
export const publicGalleryService = {
  getGallery: async (shopId: string, categoryId?: string): Promise<PublicGalleryData> => {
    const queryParams = categoryId ? `?category=${categoryId}` : ''
    const response = await apiClient.get<PublicGalleryData>(
      `/public/gallery/${shopId}/${queryParams}`,
      { headers: { Authorization: undefined } } // Remove auth header
    )
    return response.data
  },

  getItem: async (shopId: string, itemId: string): Promise<PublicGalleryItem> => {
    const response = await apiClient.get<PublicGalleryItem>(
      `/public/gallery/${shopId}/items/${itemId}/`,
      { headers: { Authorization: undefined } }
    )
    return response.data
  },
}
