export interface Location {
  id: string
  location_code: string
  name: string
  address?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  upc?: string
  category?: string
  created_at: string
  updated_at: string
}

export interface Inventory {
  id: string
  location_id: string
  product_id: string
  current_stock: number
  min_stock: number
  max_stock: number
  last_restocked?: string
  created_at: string
  updated_at: string
  location?: Location
  product?: Product
}

export interface SalesTransaction {
  id: string
  location_id: string
  product_id: string
  quantity_sold: number
  unit_price: number
  total_amount: number
  sale_date: string
  data_source: string
  raw_data?: any
  processed_at: string
  created_at: string
  location?: Location
  product?: Product
}

export interface DataImport {
  id: string
  filename: string
  data_source: string
  total_rows: number
  processed_rows: number
  failed_rows: number
  status: "processing" | "completed" | "failed"
  error_details?: string
  uploaded_by?: string
  created_at: string
}

// CSV Data Types
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
