// Inventory types

export type InventoryUnit = 'PCS' | 'MTR' | 'YRD' | 'SET' | 'ROLL' | 'SPOOL' | 'KG' | 'GM'

export interface InventoryCategory {
  id: string
  name: string
  description?: string
  default_unit: InventoryUnit
  is_active: boolean
  items_count: number
  created_at: string
  updated_at: string
}

export interface CreateInventoryCategory {
  name: string
  description?: string
  default_unit: InventoryUnit
  is_active?: boolean
}

export interface InventoryItem {
  id: string
  name: string
  description?: string
  sku?: string
  category?: string
  category_name?: string
  unit: InventoryUnit
  current_stock: number
  minimum_stock: number
  purchase_price?: number
  selling_price?: number
  notes?: string
  is_active: boolean
  is_low_stock: boolean
  created_at: string
  updated_at: string
}

export interface InventoryItemList {
  id: string
  name: string
  category_name?: string
  unit: InventoryUnit
  current_stock: number
  is_low_stock: boolean
}

export interface CreateInventoryItem {
  name: string
  description?: string
  sku?: string
  category?: string
  unit: InventoryUnit
  current_stock?: number
  minimum_stock?: number
  purchase_price?: number
  selling_price?: number
  notes?: string
  is_active?: boolean
}

export interface StockInRequest {
  quantity: number
  supplier_name?: string
  notes?: string
}

export interface StockAdjustmentRequest {
  new_stock: number
  reason: 'DAMAGED' | 'MANUAL_ADJUSTMENT'
  notes?: string
}

export interface OrderMaterial {
  id: string
  order: string
  inventory_item: string
  item_name: string
  item_unit: InventoryUnit
  quantity: number
  unit_price?: number
  total_cost?: number
  notes?: string
  added_by?: string
  created_at: string
  updated_at: string
}

export interface CreateOrderMaterial {
  inventory_item: string
  quantity: number
  notes?: string
}

export interface BulkOrderMaterialRequest {
  materials: CreateOrderMaterial[]
}

export interface OrderMaterialsResponse {
  materials: OrderMaterial[]
  total_cost: number
  count: number
}

export type StockTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT'
export type StockReason = 
  | 'PURCHASE' 
  | 'ORDER_USAGE' 
  | 'DAMAGED' 
  | 'RETURNED' 
  | 'MANUAL_ADJUSTMENT' 
  | 'INITIAL_STOCK'
  | 'ORDER_CANCELLED'

export interface StockHistory {
  id: string
  inventory_item: string
  item_name: string
  transaction_type: StockTransactionType
  reason: StockReason
  quantity: number
  stock_before: number
  stock_after: number
  order?: string
  order_number?: string
  supplier_name?: string
  notes?: string
  created_by?: string
  created_by_name?: string
  created_at: string
}

export interface InventoryDashboard {
  total_items: number
  total_categories: number
  low_stock_count: number
  total_stock_value: number
  recently_updated: InventoryItemList[]
  low_stock_items: InventoryItemList[]
}

// Unit display helpers
export const UNIT_LABELS: Record<InventoryUnit, string> = {
  PCS: 'Pieces',
  MTR: 'Meters',
  YRD: 'Yards',
  SET: 'Set',
  ROLL: 'Roll',
  SPOOL: 'Spool',
  KG: 'Kilograms',
  GM: 'Grams',
}

export const UNIT_OPTIONS: { value: InventoryUnit; label: string }[] = [
  { value: 'PCS', label: 'Pieces' },
  { value: 'MTR', label: 'Meters' },
  { value: 'YRD', label: 'Yards' },
  { value: 'SET', label: 'Set' },
  { value: 'ROLL', label: 'Roll' },
  { value: 'SPOOL', label: 'Spool' },
  { value: 'KG', label: 'Kilograms' },
  { value: 'GM', label: 'Grams' },
]
