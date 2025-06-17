import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/config/database"
import { InventoryService } from "@/lib/services/inventory.service"
import { validateSchema, InventoryUpdateSchema } from "@/lib/utils/validation"
import { createSuccessResponse, handleApiError } from "@/lib/utils/response"
import { Logger } from "@/lib/utils/logger"

const logger = new Logger("InventoryAPI")

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    logger.info("Inventory update request received", { inventoryId: id, requestBody: body })

    // Validate input - use coercion to handle string to number conversion
    try {
      const validatedUpdates = validateSchema(InventoryUpdateSchema, body)

      logger.info("Validation passed", { inventoryId: id, validatedData: validatedUpdates })

      // Use admin client for server-side operations
      const inventoryService = new InventoryService(supabaseAdmin)
      const updatedInventory = await inventoryService.updateInventory(id, validatedUpdates)

      logger.info("Successfully updated inventory", { inventoryId: id, result: updatedInventory })

      return NextResponse.json(createSuccessResponse(updatedInventory))
    } catch (validationError) {
      logger.error("Validation error", {
        error: validationError,
        requestBody: body,
        inventoryId: id,
      })
      throw validationError
    }
  } catch (error) {
    logger.error("Failed to update inventory", {
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : "Unknown",
      },
      inventoryId: params.id,
    })
    return handleApiError(error)
  }
}
