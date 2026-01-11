import api from './api'
import type {
  InventoryCategory,
  CreateInventoryCategory,
  InventoryItem,
  InventoryItemList,
  CreateInventoryItem,
  StockInRequest,
  StockAdjustmentRequest,
  OrderMaterial,
  BulkOrderMaterialRequest,
  OrderMaterialsResponse,
  StockHistory,
  InventoryDashboard,
} from '@/types/inventory'

// Inventory Categories API
export const inventoryCategoryService = {
  getAll: async (): Promise<InventoryCategory[]> => {
    const response = await api.get('/inventory/categories/')
    return response.data.results || response.data
  },

  getById: async (id: string): Promise<InventoryCategory> => {
    const response = await api.get(`/inventory/categories/${id}/`)
    return response.data
  },

  create: async (data: CreateInventoryCategory): Promise<InventoryCategory> => {
    const response = await api.post('/inventory/categories/', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateInventoryCategory>): Promise<InventoryCategory> => {
    const response = await api.patch(`/inventory/categories/${id}/`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/inventory/categories/${id}/`)
  },
}

// Inventory Items API
export const inventoryItemService = {
  getAll: async (params?: { category?: string; low_stock?: boolean; search?: string }): Promise<InventoryItemList[]> => {
    const response = await api.get('/inventory/items/', { params })
    return response.data.results || response.data
  },

  getById: async (id: string): Promise<InventoryItem> => {
    const response = await api.get(`/inventory/items/${id}/`)
    return response.data
  },

  create: async (data: CreateInventoryItem): Promise<InventoryItem> => {
    const response = await api.post('/inventory/items/', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateInventoryItem>): Promise<InventoryItem> => {
    const response = await api.patch(`/inventory/items/${id}/`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/inventory/items/${id}/`)
  },

  stockIn: async (id: string, data: StockInRequest): Promise<{ message: string; current_stock: number }> => {
    const response = await api.post(`/inventory/items/${id}/stock_in/`, data)
    return response.data
  },

  adjustStock: async (id: string, data: StockAdjustmentRequest): Promise<{ message: string; current_stock: number }> => {
    const response = await api.post(`/inventory/items/${id}/adjust_stock/`, data)
    return response.data
  },

  getHistory: async (id: string): Promise<StockHistory[]> => {
    const response = await api.get(`/inventory/items/${id}/history/`)
    return response.data
  },
}

// Order Materials API
export const orderMaterialService = {
  getByOrder: async (orderId: string): Promise<OrderMaterialsResponse> => {
    const response = await api.get(`/orders/${orderId}/materials/`)
    return response.data
  },

  addToOrder: async (orderId: string, data: BulkOrderMaterialRequest): Promise<{ materials: OrderMaterial[]; errors?: any[] }> => {
    const response = await api.post(`/orders/${orderId}/materials/add/`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/inventory/order-materials/${id}/`)
  },
}

// Inventory Dashboard API
export const inventoryDashboardService = {
  getStats: async (): Promise<InventoryDashboard> => {
    const response = await api.get('/inventory/dashboard/')
    return response.data
  },
}
