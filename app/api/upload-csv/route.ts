import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/config/database"
import { CSVProcessorService } from "@/lib/services/csv-processor.service"
import {
  validateSchema,
  parseCSVFile,
  validateCSVHeaders,
  VendorARowSchema,
  VendorBRowSchema,
} from "@/lib/utils/validation"
import { createSuccessResponse } from "@/lib/utils/response"
import type { VendorARow, VendorBRow } from "@/lib/types/domain"

export async function POST(request: NextRequest) {
  try {
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

    if (!dataSource) {
      return NextResponse.json(
        {
          success: false,
          error: "No data source provided",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    if (!["vendor_a", "vendor_b"].includes(dataSource)) {
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

    let rows: Array<Record<string, string>>
    try {
      rows = parseCSVFile(csvContent)
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

    let importRecord: any
    try {
      const { data, error: importError } = await supabaseAdmin
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

    let results: any
    try {
      const processor = new CSVProcessorService(supabaseAdmin)

      if (dataSource === "vendor_a") {
        const expectedHeaders = ["Location_ID", "Product_Name", "Scancode", "Trans_Date", "Price", "Total_Amount"]
        const actualHeaders = Object.keys(rows[0] || {})

        try {
          validateCSVHeaders(actualHeaders, expectedHeaders)
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: `Header validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              timestamp: new Date().toISOString(),
            },
            { status: 400 },
          )
        }

        const validatedRows: VendorARow[] = []
        for (let i = 0; i < rows.length; i++) {
          try {
            const validatedRow = validateSchema(VendorARowSchema, rows[i])
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

        results = await processor.processVendorA(validatedRows, importRecord.id)
      } else if (dataSource === "vendor_b") {
        const expectedHeaders = ["Site_Code", "Item_Description", "UPC", "Sale_Date", "Unit_Price", "Final_Total"]
        const actualHeaders = Object.keys(rows[0] || {})

        try {
          validateCSVHeaders(actualHeaders, expectedHeaders)
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: `Header validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              timestamp: new Date().toISOString(),
            },
            { status: 400 },
          )
        }

        const validatedRows: VendorBRow[] = []
        for (let i = 0; i < rows.length; i++) {
          try {
            const validatedRow = validateSchema(VendorBRowSchema, rows[i])
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

        results = await processor.processVendorB(validatedRows, importRecord.id)
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid data source",
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        )
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

    try {
      await supabaseAdmin
        .from("data_imports")
        .update({
          processed_rows: results.processed,
          failed_rows: results.failed,
          status: results.failed === 0 ? "completed" : "completed",
          error_details: results.errors.length > 0 ? results.errors.join("\n") : null,
        })
        .eq("id", importRecord.id)
    } catch (error) {
      // Don't fail the request for this
    }

    const response = createSuccessResponse({
      total: rows.length,
      processed: results.processed,
      failed: results.failed,
      errors: results.errors,
      importId: importRecord.id,
    })

    return NextResponse.json(response)
  } catch (error) {
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
