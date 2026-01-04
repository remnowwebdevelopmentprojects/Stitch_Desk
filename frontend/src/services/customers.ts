import apiClient from './api'
import type { Customer, PaginatedResponse } from '@/types'

export const customerService = {
  getAll: async () => {
    const response = await apiClient.get<PaginatedResponse<Customer> | Customer[]>('/customers/')
    // Handle paginated response
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return (response.data as PaginatedResponse<Customer>).results
    }
    // Fallback for non-paginated response
    return Array.isArray(response.data) ? response.data : []
  },

  getById: async (id: string) => {
    const response = await apiClient.get<Customer>(`/customers/${id}/`)
    return response.data
  },

  create: async (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await apiClient.post<Customer>('/customers/', data)
    return response.data
  },

  update: async (id: string, data: Partial<Customer>) => {
    const response = await apiClient.patch<Customer>(`/customers/${id}/`, data)
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/customers/${id}/`)
  },
}
