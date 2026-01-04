import apiClient from './api'
import type { Order, CreateOrderRequest, OrderStatus, PaginatedResponse } from '@/types'

export const orderService = {
  getAll: async (params?: { status?: OrderStatus; customer?: string }) => {
    const response = await apiClient.get<PaginatedResponse<Order> | Order[]>('/orders/', { params })
    // Handle paginated response
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return (response.data as PaginatedResponse<Order>).results
    }
    // Fallback for non-paginated response
    return Array.isArray(response.data) ? response.data : []
  },

  getById: async (id: string) => {
    const response = await apiClient.get<Order>(`/orders/${id}/`)
    return response.data
  },

  create: async (data: CreateOrderRequest) => {
    const response = await apiClient.post<Order>('/orders/', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateOrderRequest>) => {
    const response = await apiClient.patch<Order>(`/orders/${id}/`, data)
    return response.data
  },

  updateStatus: async (id: string, status: OrderStatus) => {
    const response = await apiClient.patch<Order>(`/orders/${id}/update_status/`, { status })
    return response.data
  },

  delete: async (id: string) => {
    await apiClient.delete(`/orders/${id}/`)
  },
}

