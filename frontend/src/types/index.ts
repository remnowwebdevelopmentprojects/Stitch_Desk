// Common types
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface User {
  id: number
  email: string
  name: string
  quotation_prefix?: string
  invoice_prefix?: string
  bank_name?: string
  branch_name?: string
  account_name?: string
  account_number?: string
  ifsc_code?: string
  gpay_phonepe?: string
  created_at?: string
}

// Customer types
export interface Customer {
  id: string
  name: string
  phone: string
  alternate_phone?: string
  email?: string
  address?: string
  created_at: string
  updated_at: string
}

// Order types
export type OrderStatus = 'PENDING' | 'IN_STITCHING' | 'READY' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK'
export type ItemType = 'BLOUSE' | 'SAREE' | 'DRESS' | 'OTHER'

export interface Order {
  id: string
  customer: string
  customer_name: string
  customer_phone: string
  order_number: string
  order_date: string
  delivery_date: string
  status: OrderStatus
  stitching_charge: number
  extra_charge: number
  discount: number
  subtotal: number
  tax: number
  total_amount: number
  payment_status: PaymentStatus
  amount_paid: number
  balance_amount: number
  payment_method?: PaymentMethod
  notes?: string
  items: OrderItem[]
  created_by?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order: string
  template?: string
  template_details?: MeasurementTemplate
  item_type: ItemType
  quantity: number
  unit_price?: number
  measurements: Record<string, number | string>
  sample_given: boolean
  design_reference?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateOrderItem {
  template: string
  item_type: ItemType
  quantity: number
  unit_price?: number
  measurements: Record<string, number | string>
  sample_given?: boolean
  design_reference?: string
  notes?: string
}

export interface CreateOrderRequest {
  customer: string
  order_date: string
  delivery_date: string
  status?: OrderStatus
  stitching_charge: number
  extra_charge?: number
  discount?: number
  tax?: number
  payment_status?: PaymentStatus
  amount_paid?: number
  payment_method?: PaymentMethod
  notes?: string
  items: CreateOrderItem[]
}

// Invoice types
export type GstType = 'intrastate' | 'interstate'
export type InvoiceTemplate = 'classic' | 'modern' | 'minimal' | 'elegant'

export interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  order: string | null
  order_number: string | null
  customer: string
  customer_name: string
  customer_phone: string
  customer_address: string
  gst_type: GstType | null
  cgst_percent: number | null
  sgst_percent: number | null
  igst_percent: number | null
  subtotal: number
  tax_amount: number
  total_amount: number
  notes: string | null
  terms_and_conditions: string | null
  items: InvoiceItem[]
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  item_description: string
  quantity: number
  unit: 'PCS' | 'SET' | 'PAIR' | 'MTR'
  unit_price: number
  amount: number
  order_item: string | null
  created_at: string
  updated_at: string
}

export interface CreateInvoiceItem {
  item_description: string
  quantity: number
  unit: 'PCS' | 'SET' | 'PAIR' | 'MTR'
  unit_price: number
  amount: number
  order_item?: string | null
}

export interface CreateInvoiceRequest {
  invoice_date: string
  order?: string | null
  customer: string
  customer_address: string
  gst_type?: GstType | null
  cgst_percent?: number | null
  sgst_percent?: number | null
  igst_percent?: number | null
  notes?: string
  terms_and_conditions?: string
  items: CreateInvoiceItem[]
}

// Measurement Template types
export interface MeasurementTemplateField {
  label: string
  point: string
  unit: 'CM' | 'INCH'
}

export interface MeasurementTemplate {
  id: string
  item_type: ItemType
  name: string
  image: string
  image_url?: string
  fields: MeasurementTemplateField[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateMeasurementTemplateRequest {
  item_type: ItemType
  name: string
  image: File
  fields: MeasurementTemplateField[]
  is_active?: boolean
}

// Measurement types
export interface Measurement {
  id: string
  customer: string
  customer_name?: string
  template?: string
  template_name?: string
  measurements: Record<string, number | string>
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateMeasurementRequest {
  customer: string
  template?: string
  measurements: Record<string, number | string>
  notes?: string
}

// Re-export inventory types
export * from './inventory'
