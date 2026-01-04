import { apiClient } from './api'
import type { Invoice, CreateInvoiceRequest, PaginatedResponse } from '@/types'

export interface InvoiceFilters {
  customer?: string
  order?: string
  search?: string
}

export const invoiceService = {
  getAll: async (filters?: InvoiceFilters): Promise<Invoice[]> => {
    const response = await apiClient.get<PaginatedResponse<Invoice> | Invoice[]>('/invoices/', {
      params: filters,
    })
    // Handle paginated response
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return (response.data as PaginatedResponse<Invoice>).results
    }
    return Array.isArray(response.data) ? response.data : []
  },

  getById: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get<Invoice>(`/invoices/${id}/`)
    return response.data
  },

  create: async (data: CreateInvoiceRequest): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>('/invoices/', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateInvoiceRequest>): Promise<Invoice> => {
    const response = await apiClient.patch<Invoice>(`/invoices/${id}/`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoices/${id}/`)
  },

  populateFromOrder: async (id: string): Promise<Invoice> => {
    const response = await apiClient.post<Invoice>(`/invoices/${id}/populate_from_order/`)
    return response.data
  },

  downloadPDF: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/invoices/${id}/pdf/`, {
      responseType: 'blob',
    })
    return response.data
  },
}
