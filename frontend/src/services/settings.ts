import { apiClient } from './api'
import type { InvoiceTemplate } from '@/types'

// ============== Types ==============

export interface BusinessSettings {
  shop_name: string
  logo: File | null
  logo_url: string | null
  phone_number: string | null
  email: string | null
  full_address: string | null
  gst_number: string | null
  invoice_prefix: string
  default_currency: string
}

export interface OrderSettings {
  delivery_duration_days: number
}

export interface InvoiceSettings {
  invoice_numbering_format: string
  default_tax_type: 'GST' | 'NON_GST'
  default_cgst_percent: number
  default_sgst_percent: number
  default_igst_percent: number
  show_tax_on_invoice: boolean
  invoice_template: InvoiceTemplate
}

export interface PaymentMethod {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface AllSettings {
  id: string
  shop_name: string
  logo_url: string | null
  phone_number: string | null
  email: string | null
  full_address: string | null
  gst_number: string | null
  invoice_prefix: string
  default_currency: string
  delivery_duration_days: number
  invoice_numbering_format: string
  default_tax_type: 'GST' | 'NON_GST'
  default_cgst_percent: number
  default_sgst_percent: number
  default_igst_percent: number
  show_tax_on_invoice: boolean
  invoice_template: InvoiceTemplate
}

// ============== API Functions ==============

export const settingsService = {
  // Get all settings at once
  getAllSettings: async (): Promise<AllSettings> => {
    const response = await apiClient.get('/settings/')
    return response.data
  },

  // Business settings
  getBusinessSettings: async (): Promise<BusinessSettings> => {
    const response = await apiClient.get('/settings/business/')
    return response.data
  },

  updateBusinessSettings: async (data: FormData): Promise<BusinessSettings> => {
    const response = await apiClient.post('/settings/business/', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Order settings
  getOrderSettings: async (): Promise<OrderSettings> => {
    const response = await apiClient.get('/settings/order/')
    return response.data
  },

  updateOrderSettings: async (data: OrderSettings): Promise<OrderSettings> => {
    const response = await apiClient.post('/settings/order/', data)
    return response.data
  },

  // Invoice settings
  getInvoiceSettings: async (): Promise<InvoiceSettings> => {
    const response = await apiClient.get('/settings/invoice/')
    return response.data
  },

  updateInvoiceSettings: async (data: Partial<InvoiceSettings>): Promise<InvoiceSettings> => {
    const response = await apiClient.post('/settings/invoice/', data)
    return response.data
  },

  // Payment methods
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await apiClient.get('/settings/payment-methods/')
    return response.data
  },

  createPaymentMethod: async (name: string): Promise<PaymentMethod> => {
    const response = await apiClient.post('/settings/payment-methods/', { name, is_active: true })
    return response.data
  },

  updatePaymentMethod: async (id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
    const response = await apiClient.put(`/settings/payment-methods/${id}/`, data)
    return response.data
  },

  deletePaymentMethod: async (id: string): Promise<void> => {
    await apiClient.delete(`/settings/payment-methods/${id}/`)
  },

  // Security - Password
  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/settings/security/change-password/', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    })
    return response.data
  },

  // Security - 2FA
  toggle2FA: async (enable: boolean): Promise<{ message: string }> => {
    const response = await apiClient.post('/settings/security/2fa/toggle/', { enable })
    return response.data
  },

  verify2FAOTP: async (otp: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/settings/security/2fa/verify/', { otp })
    return response.data
  },

  // Login 2FA (for login flow)
  sendLoginOTP: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/2fa/send-otp/', { email })
    return response.data
  },

  verifyLoginOTP: async (email: string, otp: string): Promise<{ token: string; user: unknown }> => {
    const response = await apiClient.post('/auth/2fa/verify-otp/', { email, otp })
    return response.data
  },
}
