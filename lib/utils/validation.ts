import { z } from "zod"
import { ValidationError } from "@/lib/types/domain"

// Validation schemas
export const LocationSchema = z.object({
  locationCode: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9._-]+$/),
  name: z.string().min(1).max(255),
  address: z.string().optional(),
})

// Updated schema with more flexible validation and better error messages
export const InventoryUpdateSchema = z
  .object({
    currentStock: z.coerce.number().int().min(0, "Current stock cannot be negative").optional(),
    minStock: z.coerce.number().int().min(0, "Minimum stock cannot be negative").optional(),
    maxStock: z.coerce.number().int().min(0, "Maximum stock cannot be negative").optional(),
  })
  .refine(
    (data) => {
      if (data.minStock !== undefined && data.maxStock !== undefined) {
        return data.minStock <= data.maxStock
      }
      return true
    },
    {
      message: "Minimum stock cannot be greater than maximum stock",
      path: ["minStock"],
    },
  )

// Update the CSV Upload Schema to be more flexible
export const CSVUploadSchema = z.object({
  dataSource: z.enum(["vendor_a", "vendor_b"] as const),
  file: z.any().refine(
    (file) => {
      if (typeof File !== "undefined" && file instanceof File) {
        return file.type === "text/csv" || file.name.endsWith(".csv")
      }
      // For server-side validation, just check if it exists
      return file != null
    },
    {
      message: "File must be a CSV file",
    },
  ),
})

// Make the validation schemas more flexible - remove strict() to allow extra fields
export const VendorARowSchema = z.object({
  Location_ID: z.string().min(1, "Location_ID is required"),
  Product_Name: z.string().min(1, "Product_Name is required"),
  Scancode: z.string().min(1, "Scancode is required"),
  Trans_Date: z.string().min(1, "Trans_Date is required"),
  Price: z.string().min(1, "Price is required"),
  Total_Amount: z.string().min(1, "Total_Amount is required"),
})

export const VendorBRowSchema = z.object({
  Site_Code: z.string().min(1, "Site_Code is required"),
  Item_Description: z.string().min(1, "Item_Description is required"),
  UPC: z.string().min(1, "UPC is required"),
  Sale_Date: z.string().min(1, "Sale_Date is required"),
  Unit_Price: z.string().min(1, "Unit_Price is required"),
  Final_Total: z.string().min(1, "Final_Total is required"),
})

// Validation utilities
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`)
      throw new ValidationError(`Validation failed: ${errorMessages.join(", ")}`, {
        zodErrors: error.errors,
      })
    }
    throw error
  }
}

// More flexible CSV header validation
export function validateCSVHeaders(headers: string[], expectedHeaders: string[]): void {
  const normalizedHeaders = headers.map((h) => h.trim())
  const normalizedExpected = expectedHeaders.map((h) => h.trim())

  const missingHeaders = normalizedExpected.filter((header) => !normalizedHeaders.includes(header))

  if (missingHeaders.length > 0) {
    throw new ValidationError(
      `Missing required CSV headers: ${missingHeaders.join(", ")}. ` + `Found headers: ${normalizedHeaders.join(", ")}`,
    )
  }

  // Don't throw errors for extra headers, just warn
  const extraHeaders = normalizedHeaders.filter((header) => !normalizedExpected.includes(header))

  if (extraHeaders.length > 0) {
    console.warn(`Extra headers found (will be ignored): ${extraHeaders.join(", ")}`)
  }
}

// Make CSV parsing more robust and flexible
export function parseCSVFile(csvContent: string): Array<Record<string, string>> {
  try {
    const lines = csvContent.trim().split(/\r?\n/) // Handle both \n and \r\n

    if (lines.length < 2) {
      throw new ValidationError("CSV file must contain at least a header row and one data row")
    }

    // Parse headers - handle quoted fields
    const headers = parseCSVLine(lines[0])
    const rows: Array<Record<string, string>> = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line === "") continue // Skip empty lines

      const values = parseCSVLine(line)

      // Be more flexible with column count - pad with empty strings if needed
      while (values.length < headers.length) {
        values.push("")
      }

      // Truncate if too many columns
      if (values.length > headers.length) {
        values.splice(headers.length)
      }

      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })

      rows.push(row)
    }

    if (rows.length === 0) {
      throw new ValidationError("No valid data rows found in CSV file")
    }

    return rows
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    throw new ValidationError(`Failed to parse CSV file: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Helper function to parse CSV line with proper quote handling
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  // Add the last field
  result.push(current.trim())

  return result
}
