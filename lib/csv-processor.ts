import { createServerSupabaseClient } from "./supabase/server"

// Define types locally to avoid import issues
interface VendorARow {
  Location_ID: string
  Product_Name: string
  Scancode: string
  Trans_Date: string
  Price: string
  Total_Amount: string
}

interface VendorBRow {
  Site_Code: string
  Item_Description: string
  UPC: string
  Sale_Date: string
  Unit_Price: string
  Final_Total: string
}

export class CSVProcessor {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  private async findOrCreateLocation(locationCode: string, dataSource: string) {
    // Normalize location codes (some sources have different formats)
    const normalizedCode = locationCode.replace(/^2\.0_/, "")

    let { data: location } = await this.supabase
      .from("locations")
      .select("*")
      .or(`location_code.eq.${locationCode},location_code.eq.${normalizedCode}`)
      .single()

    if (!location) {
      const { data: newLocation, error } = await this.supabase
        .from("locations")
        .insert({
          location_code: locationCode,
          name: `Location ${locationCode}`,
          address: `Auto-created from ${dataSource} data`,
        })
        .select()
        .single()

      if (error) throw error
      location = newLocation
    }

    return location
  }

  private async findOrCreateProduct(name: string, upc: string) {
    // Normalize product names (remove brand variations)
    const normalizedName = name.replace(/\s+(Vanilla|Berry|Arctic).*$/i, "").trim()

    let { data: product } = await this.supabase
      .from("products")
      .select("*")
      .or(`upc.eq.${upc},name.ilike.%${normalizedName}%`)
      .single()

    if (!product) {
      const { data: newProduct, error } = await this.supabase
        .from("products")
        .insert({
          name: name,
          upc: upc,
          category: this.categorizeProduct(name),
        })
        .select()
        .single()

      if (error) throw error
      product = newProduct
    }

    return product
  }

  private categorizeProduct(name: string): string {
    const lowerName = name.toLowerCase()
    if (lowerName.includes("celsius") || lowerName.includes("red bull")) return "Energy Drinks"
    if (lowerName.includes("muscle milk") || lowerName.includes("protein")) return "Protein Drinks"
    if (lowerName.includes("coke") || lowerName.includes("pepsi") || lowerName.includes("sprite")) return "Soft Drinks"
    if (lowerName.includes("snickers") || lowerName.includes("candy")) return "Candy"
    if (lowerName.includes("doritos") || lowerName.includes("lays") || lowerName.includes("chips")) return "Snacks"
    return "Other"
  }

  private parseDate(dateStr: string): string {
    // Handle different date formats
    if (dateStr.includes("/")) {
      // MM/DD/YYYY format
      const [month, day, year] = dateStr.split("/")
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    } else if (dateStr.includes("-")) {
      // YYYY-MM-DD format
      return dateStr
    }
    throw new Error(`Invalid date format: ${dateStr}`)
  }

  async processVendorA(rows: VendorARow[], importId: string) {
    const results = { processed: 0, failed: 0, errors: [] as string[] }

    for (const row of rows) {
      try {
        const location = await this.findOrCreateLocation(row.Location_ID, "vendor_a")
        const product = await this.findOrCreateProduct(row.Product_Name, row.Scancode)

        const saleDate = this.parseDate(row.Trans_Date)
        const unitPrice = Number.parseFloat(row.Price)
        const totalAmount = Number.parseFloat(row.Total_Amount)

        // Insert sales transaction
        const { error: salesError } = await this.supabase.from("sales_transactions").insert({
          location_id: location.id,
          product_id: product.id,
          quantity_sold: 1, // Assuming 1 item per transaction
          unit_price: unitPrice,
          total_amount: totalAmount,
          sale_date: saleDate,
          data_source: "vendor_a",
          raw_data: row,
        })

        if (salesError) throw salesError

        // Update inventory (reduce stock)
        await this.updateInventory(location.id, product.id, -1)

        results.processed++
      } catch (error) {
        results.failed++
        results.errors.push(`Row ${results.processed + results.failed}: ${error}`)
      }
    }

    return results
  }

  async processVendorB(rows: VendorBRow[], importId: string) {
    const results = { processed: 0, failed: 0, errors: [] as string[] }

    for (const row of rows) {
      try {
        const location = await this.findOrCreateLocation(row.Site_Code, "vendor_b")
        const product = await this.findOrCreateProduct(row.Item_Description, row.UPC)

        const saleDate = this.parseDate(row.Sale_Date)
        const unitPrice = Number.parseFloat(row.Unit_Price)
        const totalAmount = Number.parseFloat(row.Final_Total)

        // Insert sales transaction
        const { error: salesError } = await this.supabase.from("sales_transactions").insert({
          location_id: location.id,
          product_id: product.id,
          quantity_sold: 1, // Assuming 1 item per transaction
          unit_price: unitPrice,
          total_amount: totalAmount,
          sale_date: saleDate,
          data_source: "vendor_b",
          raw_data: row,
        })

        if (salesError) throw salesError

        // Update inventory (reduce stock)
        await this.updateInventory(location.id, product.id, -1)

        results.processed++
      } catch (error) {
        results.failed++
        results.errors.push(`Row ${results.processed + results.failed}: ${error}`)
      }
    }

    return results
  }

  private async updateInventory(locationId: string, productId: string, quantityChange: number) {
    // Get current inventory
    const { data: inventory } = await this.supabase
      .from("inventory")
      .select("*")
      .eq("location_id", locationId)
      .eq("product_id", productId)
      .single()

    if (inventory) {
      // Update existing inventory
      const newStock = Math.max(0, inventory.current_stock + quantityChange)
      await this.supabase
        .from("inventory")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inventory.id)
    } else {
      // Create new inventory record
      await this.supabase.from("inventory").insert({
        location_id: locationId,
        product_id: productId,
        current_stock: Math.max(0, quantityChange),
        min_stock: 5,
        max_stock: 50,
      })
    }
  }

  // Static method to create an instance with server client
  static async create() {
    const supabase = await createServerSupabaseClient()
    return new CSVProcessor(supabase)
  }
}
