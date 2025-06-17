import type { SupabaseClient } from "@supabase/supabase-js"

// Define types locally to avoid import issues - with index signatures
interface VendorARow {
  Location_ID: string
  Product_Name: string
  Scancode: string
  Trans_Date: string
  Price: string
  Total_Amount: string
  [key: string]: string // Add index signature
}

interface VendorBRow {
  Site_Code: string
  Item_Description: string
  UPC: string
  Sale_Date: string
  Unit_Price: string
  Final_Total: string
  [key: string]: string // Add index signature
}

interface ProcessingResult {
  processed: number
  failed: number
  errors: string[]
}

interface NormalizedTransaction {
  locationCode: string
  productName: string
  upc: string
  saleDate: string
  unitPrice: number
  totalAmount: number
  rawData: Record<string, any> // Changed to any for flexibility
}

interface Location {
  id: string
  name: string
  location_code: string
  address: string | null
}

interface Product {
  id: string
  name: string
  upc: string
  category: string
}

type ProductCategory = "Energy Drinks" | "Protein Drinks" | "Soft Drinks" | "Candy" | "Snacks" | "Other"
type DataSource = "vendor_a" | "vendor_b"

export class CSVProcessorService {
  private db: SupabaseClient

  constructor(db: SupabaseClient) {
    this.db = db
  }

  async processVendorA(rows: VendorARow[], importId: string): Promise<ProcessingResult> {
    const results: ProcessingResult = { processed: 0, failed: 0, errors: [] }

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]
      try {
        const normalized = this.normalizeVendorARow(row)
        await this.processNormalizedTransaction(normalized, "vendor_a")
        results.processed++
      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        results.errors.push(`Row ${index + 1}: ${errorMessage}`)
      }
    }

    return results
  }

  async processVendorB(rows: VendorBRow[], importId: string): Promise<ProcessingResult> {
    const results: ProcessingResult = { processed: 0, failed: 0, errors: [] }

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]
      try {
        const normalized = this.normalizeVendorBRow(row)
        await this.processNormalizedTransaction(normalized, "vendor_b")
        results.processed++
      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        results.errors.push(`Row ${index + 1}: ${errorMessage}`)
      }
    }

    return results
  }

  private normalizeVendorARow(row: VendorARow): NormalizedTransaction {
    this.validateVendorARow(row)

    return {
      locationCode: this.normalizeLocationCode(row.Location_ID),
      productName: row.Product_Name.trim(),
      upc: row.Scancode.trim(),
      saleDate: this.parseDate(row.Trans_Date),
      unitPrice: this.parsePrice(row.Price),
      totalAmount: this.parsePrice(row.Total_Amount),
      rawData: { ...row }, // Spread operator to ensure compatibility
    }
  }

  private normalizeVendorBRow(row: VendorBRow): NormalizedTransaction {
    this.validateVendorBRow(row)

    return {
      locationCode: this.normalizeLocationCode(row.Site_Code),
      productName: row.Item_Description.trim(),
      upc: row.UPC.trim(),
      saleDate: this.parseDate(row.Sale_Date),
      unitPrice: this.parsePrice(row.Unit_Price),
      totalAmount: this.parsePrice(row.Final_Total),
      rawData: { ...row }, // Spread operator to ensure compatibility
    }
  }

  private async processNormalizedTransaction(
    transaction: NormalizedTransaction,
    dataSource: DataSource,
  ): Promise<void> {
    try {
      const location = await this.findOrCreateLocation(
        transaction.locationCode,
        `Location ${transaction.locationCode}`,
        `Auto-created from ${dataSource} data`,
      )

      const product = await this.findOrCreateProduct(
        transaction.upc,
        transaction.productName,
        this.categorizeProduct(transaction.productName),
      )

      await this.createSalesTransaction(location, product, transaction, dataSource)
      await this.ensureInventoryExists(location.id, product.id)
      await this.updateInventory(location.id, product.id, -1)
    } catch (error) {
      throw error
    }
  }

  private async findOrCreateLocation(locationCode: string, name: string, address: string): Promise<Location> {
    try {
      const { data: existingLocation, error: fetchError } = await this.db
        .from("locations")
        .select("*")
        .eq("location_code", locationCode)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError
      }

      if (existingLocation) {
        return existingLocation
      }

      const { data: newLocation, error: insertError } = await this.db
        .from("locations")
        .insert({
          location_code: locationCode,
          name: name,
          address: address,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return newLocation
    } catch (error) {
      throw new Error(`Failed to find or create location: ${error}`)
    }
  }

  private async findOrCreateProduct(upc: string, name: string, category: ProductCategory): Promise<Product> {
    try {
      const { data: existingProduct, error: fetchError } = await this.db
        .from("products")
        .select("*")
        .eq("upc", upc)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError
      }

      if (existingProduct) {
        return existingProduct
      }

      const { data: newProduct, error: insertError } = await this.db
        .from("products")
        .insert({
          upc: upc,
          name: name,
          category: category,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return newProduct
    } catch (error) {
      throw new Error(`Failed to find or create product: ${error}`)
    }
  }

  private async ensureInventoryExists(locationId: string, productId: string): Promise<void> {
    try {
      const { data: existingInventory, error: fetchError } = await this.db
        .from("inventory")
        .select("*")
        .eq("location_id", locationId)
        .eq("product_id", productId)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError
      }

      if (!existingInventory) {
        const { error: insertError } = await this.db.from("inventory").insert({
          location_id: locationId,
          product_id: productId,
          current_stock: 25,
          min_stock: 5,
          max_stock: 50,
        })

        if (insertError) {
          throw insertError
        }
      }
    } catch (error) {
      throw error
    }
  }

  private async updateInventory(locationId: string, productId: string, quantityChange: number): Promise<void> {
    try {
      const { data: inventory, error: fetchError } = await this.db
        .from("inventory")
        .select("*")
        .eq("location_id", locationId)
        .eq("product_id", productId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      const newStock = Math.max(0, (inventory.current_stock || 0) + quantityChange)

      const { error: updateError } = await this.db
        .from("inventory")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inventory.id)

      if (updateError) {
        throw updateError
      }
    } catch (error) {
      throw new Error(`Failed to update inventory: ${error}`)
    }
  }

  private async createSalesTransaction(
    location: Location,
    product: Product,
    transaction: NormalizedTransaction,
    dataSource: DataSource,
  ): Promise<void> {
    try {
      const { error } = await this.db.from("sales_transactions").insert({
        location_id: location.id,
        product_id: product.id,
        quantity_sold: 1,
        unit_price: transaction.unitPrice,
        total_amount: transaction.totalAmount,
        sale_date: transaction.saleDate,
        data_source: dataSource,
        raw_data: transaction.rawData,
      })

      if (error) {
        throw new Error(`Failed to create sales transaction: ${error.message}`)
      }
    } catch (error) {
      throw error
    }
  }

  private validateVendorARow(row: VendorARow): void {
    const requiredFields = ["Location_ID", "Product_Name", "Scancode", "Trans_Date", "Price", "Total_Amount"]
    const missingFields = requiredFields.filter((field) => {
      const value = row[field as keyof VendorARow]
      return !value || (typeof value === "string" && value.trim() === "")
    })

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`)
    }
  }

  private validateVendorBRow(row: VendorBRow): void {
    const requiredFields = ["Site_Code", "Item_Description", "UPC", "Sale_Date", "Unit_Price", "Final_Total"]
    const missingFields = requiredFields.filter((field) => {
      const value = row[field as keyof VendorBRow]
      return !value || (typeof value === "string" && value.trim() === "")
    })

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`)
    }
  }

  private normalizeLocationCode(locationCode: string): string {
    return locationCode.replace(/^2\.0_/, "").trim()
  }

  private parseDate(dateStr: string): string {
    try {
      if (dateStr.includes("/")) {
        const [month, day, year] = dateStr.split("/")
        const parsedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        return parsedDate
      } else if (dateStr.includes("-")) {
        return dateStr
      }
      throw new Error(`Invalid date format: ${dateStr}`)
    } catch (error) {
      throw new Error(`Failed to parse date: ${dateStr}`)
    }
  }

  private parsePrice(priceStr: string): number {
    try {
      const price = Number.parseFloat(priceStr.replace(/[^0-9.-]/g, ""))
      if (isNaN(price) || price < 0) {
        throw new Error(`Invalid price: ${priceStr}`)
      }
      return price
    } catch (error) {
      throw new Error(`Failed to parse price: ${priceStr}`)
    }
  }

  private categorizeProduct(productName: string): ProductCategory {
    const name = productName.toLowerCase()

    if (name.includes("celsius") || name.includes("red bull") || name.includes("monster")) {
      return "Energy Drinks"
    }
    if (name.includes("muscle milk") || name.includes("protein")) {
      return "Protein Drinks"
    }
    if (name.includes("coke") || name.includes("pepsi") || name.includes("sprite") || name.includes("cola")) {
      return "Soft Drinks"
    }
    if (name.includes("snickers") || name.includes("candy") || name.includes("chocolate")) {
      return "Candy"
    }
    if (name.includes("doritos") || name.includes("lays") || name.includes("chips") || name.includes("crackers")) {
      return "Snacks"
    }

    return "Other"
  }
}
