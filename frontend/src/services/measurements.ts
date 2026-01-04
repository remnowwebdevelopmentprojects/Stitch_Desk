import apiClient from './api'
import type { Measurement, CreateMeasurementRequest, PaginatedResponse } from '@/types'

export const measurementService = {
  getAll: async (customerId?: string) => {
    const params = customerId ? { customer: customerId } : {}
    const response = await apiClient.get<PaginatedResponse<Measurement> | Measurement[]>('/measurements/', { params })
    // Handle paginated response
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return (response.data as PaginatedResponse<Measurement>).results
    }
    // Fallback for non-paginated response
    return Array.isArray(response.data) ? response.data : []
  },

  getById: async (id: string) => {
    const response = await apiClient.get<Measurement>(`/measurements/${id}/`)
    return response.data
  },

  create: async (data: CreateMeasurementRequest) => {
    const response = await apiClient.post<Measurement>('/measurements/', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateMeasurementRequest>) => {
    const response = await apiClient.patch<Measurement>(`/measurements/${id}/`, data)
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/measurements/${id}/`)
  },
}

