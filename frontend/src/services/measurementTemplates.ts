import apiClient from './api'
import type { MeasurementTemplate, CreateMeasurementTemplateRequest, PaginatedResponse } from '@/types'

export const measurementTemplateService = {
  getAll: async (itemType?: string, activeOnly?: boolean) => {
    const params: Record<string, string> = {}
    if (itemType) params.item_type = itemType
    if (activeOnly) params.active_only = 'true'
    
    const response = await apiClient.get<PaginatedResponse<MeasurementTemplate> | MeasurementTemplate[]>('/measurement-templates/', { params })
    // Handle paginated response
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return (response.data as PaginatedResponse<MeasurementTemplate>).results
    }
    return Array.isArray(response.data) ? response.data : []
  },

  getById: async (id: string) => {
    const response = await apiClient.get<MeasurementTemplate>(`/measurement-templates/${id}/`)
    return response.data
  },

  create: async (data: CreateMeasurementTemplateRequest) => {
    const formData = new FormData()
    formData.append('item_type', data.item_type)
    formData.append('name', data.name)
    formData.append('image', data.image)
    formData.append('fields', JSON.stringify(data.fields))
    if (data.is_active !== undefined) {
      formData.append('is_active', data.is_active.toString())
    }

    const response = await apiClient.post<MeasurementTemplate>('/measurement-templates/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  update: async (id: string, data: Partial<CreateMeasurementTemplateRequest>) => {
    const formData = new FormData()
    if (data.item_type) formData.append('item_type', data.item_type)
    if (data.name) formData.append('name', data.name)
    if (data.image) formData.append('image', data.image)
    if (data.fields) formData.append('fields', JSON.stringify(data.fields))
    if (data.is_active !== undefined) {
      formData.append('is_active', data.is_active.toString())
    }

    const response = await apiClient.patch<MeasurementTemplate>(`/measurement-templates/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/measurement-templates/${id}/`)
  },
}

