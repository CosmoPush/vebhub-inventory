import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// Define types locally
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

// Simple CSV parser
function parseCSV(csvContent: string): Array<Record<string, string>> {
  const lines = csvContent.trim().split("\n")
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header row and one data row")
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ""
    })

    rows.push(row)
  }

  return rows
}

// Validation functions
function validateVendorARow(row: Record<string, string>): VendorARow {
  const requiredFields = ["Location_ID", "Product_Name", "Scancode", "Trans_Date", "Price", "Total_Amount"]

  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === "") {
      throw new Error(`Missing required field: ${field}`)
    }
  }

  return {
    Location_ID: row.Location_ID.trim(),
    Product_Name: row.Product_Name.trim(),
    Scancode: row.Scancode.trim(),
    Trans_Date: row.Trans_Date.trim(),
    Price: row.Price.trim(),
    Total_Amount: row.Total_Amount.trim(),
  }
}

function validateVendorBRow(row: Record<string, string>): VendorBRow {
  const requiredFields = ["Site_Code", "Item_Description", "UPC", "Sale_Date", "Unit_Price", "Final_Total"]

  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === "") {
      throw new Error(`Missing required field: ${field}`)
    }
  }

  return {
    Site_Code: row.Site_Code.trim(),
    Item_Description: row.Item_Description.trim(),
    UPC: row.UPC.trim(),
    Sale_Date: row.Sale_Date.trim(),
    Unit_Price: row.Unit_Price.trim(),
    Final_Total: row.Final_Total.trim(),
  }
}

// Process vendor data
async function processVendorAData(rows: VendorARow[], supabase: any) {
  let processed = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      // Parse date
      const transDate = new Date(row.Trans_Date)
      if (isNaN(transDate.getTime())) {
        throw new Error(`Invalid date format: ${row.Trans_Date}`)
      }

      // Parse price and total
      const price = Number.parseFloat(row.Price.replace(/[^0-9.-]/g, ""))
      const totalAmount = Number.parseFloat(row.Total_Amount.replace(/[^0-9.-]/g, ""))

      if (isNaN(price) || isNaN(totalAmount)) {
        throw new Error("Invalid price or total amount")
      }

      // Insert or update location
      const { data: location, error: locationError } = await supabase
        .from("locations")
        .upsert(
          {
            location_code: row.Location_ID,
            name: `Location ${row.Location_ID}`,
          },
          {
            onConflict: "location_code",
            ignoreDuplicates: false,
          },
        )
        .select()
        .single()

      if (locationError) {
        throw new Error(`Location error: ${locationError.message}`)
      }

      // Insert or update product
      const { data: product, error: productError } = await supabase
        .from("products")
        .upsert(
          {
            upc: row.Scancode,
            name: row.Product_Name,
            category: "General",
          },
          {
            onConflict: "upc",
            ignoreDuplicates: false,
          },
        )
        .select()
        .single()

      if (productError) {
        throw new Error(`Product error: ${productError.message}`)
      }

      // Insert sales transaction
      const { error: salesError } = await supabase.from("sales_transactions").insert({
        location_id: location.id,
        product_id: product.id,
        sale_date: transDate.toISOString().split("T")[0],
        quantity: 1,
        unit_price: price,
        total_amount: totalAmount,
      })

      if (salesError) {
        throw new Error(`Sales transaction error: ${salesError.message}`)
      }

      // Update or create inventory
      const { error: inventoryError } = await supabase.from("inventory").upsert(
        {
          location_id: location.id,
          product_id: product.id,
          current_stock: 0, // Will be updated based on sales data
          min_stock: 5,
          max_stock: 50,
        },
        {
          onConflict: "location_id,product_id",
          ignoreDuplicates: true,
        },
      )

      if (inventoryError) {
        console.warn("Inventory update warning:", inventoryError.message)
      }

      processed++
    } catch (error) {
      failed++
      errors.push(`Row ${processed + failed}: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return { processed, failed, errors }
}

async function processVendorBData(rows: VendorBRow[], supabase: any) {
  let processed = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      // Parse date
      const saleDate = new Date(row.Sale_Date)
      if (isNaN(saleDate.getTime())) {
        throw new Error(`Invalid date format: ${row.Sale_Date}`)
      }

      // Parse price and total
      const unitPrice = Number.parseFloat(row.Unit_Price.replace(/[^0-9.-]/g, ""))
      const finalTotal = Number.parseFloat(row.Final_Total.replace(/[^0-9.-]/g, ""))

      if (isNaN(unitPrice) || isNaN(finalTotal)) {
        throw new Error("Invalid unit price or final total")
      }

      // Insert or update location
      const { data: location, error: locationError } = await supabase
        .from("locations")
        .upsert(
          {
            location_code: row.Site_Code,
            name: `Site ${row.Site_Code}`,
          },
          {
            onConflict: "location_code",
            ignoreDuplicates: false,
          },
        )
        .select()
        .single()

      if (locationError) {
        throw new Error(`Location error: ${locationError.message}`)
      }

      // Insert or update product
      const { data: product, error: productError } = await supabase
        .from("products")
        .upsert(
          {
            upc: row.UPC,
            name: row.Item_Description,
            category: "General",
          },
          {
            onConflict: "upc",
            ignoreDuplicates: false,
          },
        )
        .select()
        .single()

      if (productError) {
        throw new Error(`Product error: ${productError.message}`)
      }

      // Insert sales transaction
      const { error: salesError } = await supabase.from("sales_transactions").insert({
        location_id: location.id,
        product_id: product.id,
        sale_date: saleDate.toISOString().split("T")[0],
        quantity: 1,
        unit_price: unitPrice,
        total_amount: finalTotal,
      })

      if (salesError) {
        throw new Error(`Sales transaction error: ${salesError.message}`)
      }

      // Update or create inventory
      const { error: inventoryError } = await supabase.from("inventory").upsert(
        {
          location_id: location.id,
          product_id: product.id,
          current_stock: 0, // Will be updated based on sales data
          min_stock: 5,
          max_stock: 50,
        },
        {
          onConflict: "location_id,product_id",
          ignoreDuplicates: true,
        },
      )

      if (inventoryError) {
        console.warn("Inventory update warning:", inventoryError.message)
      }

      processed++
    } catch (error) {
      failed++
      errors.push(`Row ${processed + failed}: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return { processed, failed, errors }
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse form data",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    const file = formData.get("file") as File
    const dataSource = formData.get("dataSource") as string

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    if (!dataSource || !["vendor_a", "vendor_b"].includes(dataSource)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid data source. Must be 'vendor_a' or 'vendor_b'",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return NextResponse.json(
        {
          success: false,
          error: "File must be a CSV file",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Read file content
    let csvContent: string
    try {
      csvContent = await file.text()
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to read file content",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    if (!csvContent.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "CSV file is empty",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Parse CSV
    let rows: Array<Record<string, string>>
    try {
      rows = parseCSV(csvContent)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse CSV: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Create Supabase client
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }

    // Create import record
    let importRecord: any
    try {
      const { data, error: importError } = await supabase
        .from("data_imports")
        .insert({
          filename: file.name,
          data_source: dataSource,
          total_rows: rows.length,
          processed_rows: 0,
          failed_rows: 0,
          status: "processing",
        })
        .select()
        .single()

      if (importError) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to create import record: ${importError.message}`,
            timestamp: new Date().toISOString(),
          },
          { status: 500 },
        )
      }

      importRecord = data
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create import record",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Process data based on vendor
    let results: { processed: number; failed: number; errors: string[] }

    try {
      if (dataSource === "vendor_a") {
        // Validate headers
        const expectedHeaders = ["Location_ID", "Product_Name", "Scancode", "Trans_Date", "Price", "Total_Amount"]
        const actualHeaders = Object.keys(rows[0] || {})

        for (const header of expectedHeaders) {
          if (!actualHeaders.includes(header)) {
            throw new Error(`Missing required header: ${header}`)
          }
        }

        // Validate and process rows
        const validatedRows: VendorARow[] = []
        for (let i = 0; i < rows.length; i++) {
          try {
            const validatedRow = validateVendorARow(rows[i])
            validatedRows.push(validatedRow)
          } catch (error) {
            return NextResponse.json(
              {
                success: false,
                error: `Row ${i + 1} validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                timestamp: new Date().toISOString(),
              },
              { status: 400 },
            )
          }
        }

        results = await processVendorAData(validatedRows, supabase)
      } else {
        // Validate headers
        const expectedHeaders = ["Site_Code", "Item_Description", "UPC", "Sale_Date", "Unit_Price", "Final_Total"]
        const actualHeaders = Object.keys(rows[0] || {})

        for (const header of expectedHeaders) {
          if (!actualHeaders.includes(header)) {
            throw new Error(`Missing required header: ${header}`)
          }
        }

        // Validate and process rows
        const validatedRows: VendorBRow[] = []
        for (let i = 0; i < rows.length; i++) {
          try {
            const validatedRow = validateVendorBRow(rows[i])
            validatedRows.push(validatedRow)
          } catch (error) {
            return NextResponse.json(
              {
                success: false,
                error: `Row ${i + 1} validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                timestamp: new Date().toISOString(),
              },
              { status: 400 },
            )
          }
        }

        results = await processVendorBData(validatedRows, supabase)
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Update import record
    try {
      await supabase
        .from("data_imports")
        .update({
          processed_rows: results.processed,
          failed_rows: results.failed,
          status: results.failed === 0 ? "completed" : "completed_with_errors",
          error_details: results.errors.length > 0 ? results.errors.join("\n") : null,
        })
        .eq("id", importRecord.id)
    } catch (error) {
      console.warn("Failed to update import record:", error)
    }

    return NextResponse.json({
      success: true,
      data: {
        total: rows.length,
        processed: results.processed,
        failed: results.failed,
        errors: results.errors,
        importId: importRecord.id,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Upload CSV error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during upload",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
