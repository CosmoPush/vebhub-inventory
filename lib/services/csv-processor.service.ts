import type { SupabaseClient } from "@supabase/supabase-js"
import { BaseService } from "./base.service"
import { LocationService } from "./location.service"
import { ProductService } from "./product.service"
import { InventoryService } from "./inventory.service"
import type { VendorARow, VendorBRow, DataSource, Location, Product, ProductCategory } from "@/lib/types/domain"
import { ProcessingError, ValidationError } from "@/lib/types/domain"

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
  rawData: Record<string, unknown>
}

export class CSVProcessorService extends BaseService {
  private readonly locationService: LocationService
  private readonly productService: ProductService
  private readonly inventoryService: InventoryService

  constructor(db: SupabaseClient) {
    super(db, "CSVProcessorService")
    this.locationService = new LocationService(db)
    this.productService = new ProductService(db)
    this.inventoryService = new InventoryService(db)
  }

  async processVendorA(rows: VendorARow[], importId: string): Promise<ProcessingResult> {
    const results: ProcessingResult = { processed: 0, failed: 0, errors: [] }

    for (const [index, row] of rows.entries()) {
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

    for (const [index, row] of rows.entries()) {
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
      rawData: row,
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
      rawData: row,
    }
  }

  private async processNormalizedTransaction(
    transaction: NormalizedTransaction,
    dataSource: DataSource,
  ): Promise<void> {
    try {
      const location = await this.locationService.findOrCreateByCode(
        transaction.locationCode,
        `Location ${transaction.locationCode}`,
        `Auto-created from ${dataSource} data`,
      )

      const product = await this.productService.findOrCreateByUPC(
        transaction.upc,
        transaction.productName,
        this.categorizeProduct(transaction.productName),
      )

      await this.createSalesTransaction(location, product, transaction, dataSource)
      await this.ensureInventoryExists(location.id, product.id)
      await this.inventoryService.updateInventoryByLocationAndProduct(location.id, product.id, -1)
    } catch (error) {
      throw error
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
        const { data: newInventory, error: insertError } = await this.db
          .from("inventory")
          .insert({
            location_id: locationId,
            product_id: productId,
            current_stock: 25,
            min_stock: 5,
            max_stock: 50,
          })
          .select()
          .single()

        if (insertError) {
          throw insertError
        }
      }
    } catch (error) {
      throw error
    }
  }

  private async createSalesTransaction(
    location: Location,
    product: Product,
    transaction: NormalizedTransaction,
    dataSource: DataSource,
  ): Promise<void> {
    try {
      const { data, error } = await this.db
        .from("sales_transactions")
        .insert({
          location_id: location.id,
          product_id: product.id,
          quantity_sold: 1,
          unit_price: transaction.unitPrice,
          total_amount: transaction.totalAmount,
          sale_date: transaction.saleDate,
          data_source: dataSource,
          raw_data: transaction.rawData,
        })
        .select()
        .single()

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
      throw new ValidationError(`Missing required fields: ${missingFields.join(", ")}`)
    }
  }

  private validateVendorBRow(row: VendorBRow): void {
    const requiredFields = ["Site_Code", "Item_Description", "UPC", "Sale_Date", "Unit_Price", "Final_Total"]
    const missingFields = requiredFields.filter((field) => {
      const value = row[field as keyof VendorBRow]
      return !value || (typeof value === "string" && value.trim() === "")
    })

    if (missingFields.length > 0) {
      throw new ValidationError(`Missing required fields: ${missingFields.join(", ")}`)
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
      throw new ProcessingError(`Failed to parse date: ${dateStr}`)
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
      throw new ProcessingError(`Failed to parse price: ${priceStr}`)
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
