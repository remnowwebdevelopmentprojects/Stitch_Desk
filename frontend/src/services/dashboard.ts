import apiClient from './api'
import type { Order } from '@/types'

export interface DashboardStats {
  total_customers: number
  pending_orders: number
  monthly_revenue: number
  unpaid_invoices: number
  overdue_orders: number
  orders_due_week: number
  recent_orders: Order[]
  revenue_trend: Array<{
    month: string
    revenue: number
  }>
  payment_breakdown: {
    paid: number
    partial: number
    unpaid: number
  }
}

export const dashboardService = {
  getStats: async () => {
    const response = await apiClient.get<DashboardStats>('/orders/dashboard_stats/')
    return response.data
  },
}
