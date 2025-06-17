import { NextResponse } from "next/server"
import { supabase } from "@/lib/config/database"
import { InventoryService } from "@/lib/services/inventory.service"
import { createSuccessResponse, handleApiError } from "@/lib/utils/response"
import { Logger } from "@/lib/utils/logger"

const logger = new Logger("LocationDetailAPI")

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    logger.info("Fetching location with inventory", { locationId: id })

    const inventoryService = new InventoryService(supabase)
    const location = await inventoryService.getLocationWithInventory(id)

    logger.info("Successfully fetched location", { locationId: id })

    return NextResponse.json(createSuccessResponse(location))
  } catch (error) {
    logger.error("Failed to fetch location", { error, locationId: params.id })
    return handleApiError(error)
  }
}
