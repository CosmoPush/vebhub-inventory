// Domain Types - Core business entities
export interface Location {
  readonly id: string
  readonly locationCode: string
  readonly name: string
  readonly address?: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface Product {
  readonly id: string
  readonly name: string
  readonly upc?: string
  readonly category?: ProductCategory
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface Inventory {
  readonly id: string
  readonly locationId: string
  readonly productId: string
  readonly currentStock: number
  readonly minStock: number
  readonly maxStock: number
  readonly lastRestocked?: Date
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface SalesTransaction {
  readonly id: string
  readonly locationId: string
  readonly productId: string
  readonly quantitySold: number
  readonly unitPrice: number
  readonly totalAmount: number
  readonly saleDate: Date
  readonly dataSource: DataSource
  readonly rawData?: Record<string, unknown>
  readonly processedAt: Date
  readonly createdAt: Date
}

export interface DataImport {
  readonly id: string
  readonly filename: string
  readonly dataSource: DataSource
  readonly totalRows: number
  readonly processedRows: number
  readonly failedRows: number
  readonly status: ImportStatus
  readonly errorDetails?: string
  readonly uploadedBy?: string
  readonly createdAt: Date
}

// Value Objects
export type ProductCategory = "Energy Drinks" | "Protein Drinks" | "Soft Drinks" | "Candy" | "Snacks" | "Other"

export type DataSource = "vendor_a" | "vendor_b"
export type ImportStatus = "processing" | "completed" | "failed"
export type StockStatus = "good" | "low" | "out"

// DTOs for API communication
export interface CreateLocationDTO {
  locationCode: string
  name: string
  address?: string
}

export interface UpdateInventoryDTO {
  currentStock?: number
  minStock?: number
  maxStock?: number
}

export interface ProcessCSVDTO {
  file: File
  dataSource: DataSource
}

// Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: Record<string, unknown>
  code?: string
  timestamp: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// CSV Row Types
export interface VendorARow {
  Location_ID: string
  Product_Name: string
  Scancode: string
  Trans_Date: string
  Price: string
  Total_Amount: string
}

export interface VendorBRow {
  Site_Code: string
  Item_Description: string
  UPC: string
  Sale_Date: string
  Unit_Price: string
  Final_Total: string
}

// Business Logic Types
export interface InventoryWithDetails extends Inventory {
  location: Location
  product: Product
  stockStatus: StockStatus
}

export interface LocationWithInventory extends Location {
  inventory: InventoryWithDetails[]
  lowStockCount: number
  totalProducts: number
  stockStatus: StockStatus
}

// Error Types
export class VendHubError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "VendHubError"
  }
}

export class ValidationError extends VendHubError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details)
    this.name = "ValidationError"
  }
}

export class NotFoundError extends VendHubError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, "NOT_FOUND", 404)
    this.name = "NotFoundError"
  }
}

export class ProcessingError extends VendHubError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "PROCESSING_ERROR", 422, details)
    this.name = "ProcessingError"
  }
}

