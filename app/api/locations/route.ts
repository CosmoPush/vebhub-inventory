import { NextResponse } from "next/server"
import { supabase } from "@/lib/config/database"
import { InventoryService } from "@/lib/services/inventory.service"
import { createSuccessResponse, handleApiError } from "@/lib/utils/response"
import { Logger } from "@/lib/utils/logger"

const logger = new Logger("LocationsAPI")

export async function GET() {
  try {
    logger.info("Fetching all locations with inventory")

    const inventoryService = new InventoryService(supabase)
    const locations = await inventoryService.getAllLocationsWithInventory()

    logger.info("Successfully fetched locations", { count: locations.length })

    return NextResponse.json(createSuccessResponse(locations))
  } catch (error) {
    logger.error("Failed to fetch locations", { error })
    return handleApiError(error)
  }
}
