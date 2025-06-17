import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/config/database"
import { InventoryService } from "@/lib/services/inventory.service"
import { createSuccessResponse, handleApiError } from "@/lib/utils/response"
import { Logger } from "@/lib/utils/logger"

const logger = new Logger("LocationDetailAPI")

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    logger.info("Fetching location with inventory", { locationId: id })

    const inventoryService = new InventoryService(supabase)
    const location = await inventoryService.getLocationWithInventory(id)

    logger.info("Successfully fetched location", { locationId: id })

    return NextResponse.json(createSuccessResponse(location))
  } catch (error) {
    logger.error("Failed to fetch location", { error, locationId: (await context.params).id })
    return handleApiError(error)
  }
}
