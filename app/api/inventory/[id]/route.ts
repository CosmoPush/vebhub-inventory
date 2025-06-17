import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

// Simple validation function
function validateInventoryUpdate(data: any) {
  const errors: string[] = []

  if (data.currentStock !== undefined) {
    const currentStock = Number(data.currentStock)
    if (isNaN(currentStock) || currentStock < 0) {
      errors.push("currentStock must be a non-negative number")
    }
  }

  if (data.minStock !== undefined) {
    const minStock = Number(data.minStock)
    if (isNaN(minStock) || minStock < 0) {
      errors.push("minStock must be a non-negative number")
    }
  }

  if (data.maxStock !== undefined) {
    const maxStock = Number(data.maxStock)
    if (isNaN(maxStock) || maxStock < 0) {
      errors.push("maxStock must be a non-negative number")
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(", ")}`)
  }

  return {
    ...(data.currentStock !== undefined && { current_stock: Number(data.currentStock) }),
    ...(data.minStock !== undefined && { min_stock: Number(data.minStock) }),
    ...(data.maxStock !== undefined && { max_stock: Number(data.maxStock) }),
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Await the params Promise
    const { id } = await context.params
    const body = await request.json()

    console.log("Inventory update request received", { inventoryId: id, requestBody: body })

    // Validate input
    const validatedUpdates = validateInventoryUpdate(body)
    console.log("Validation passed", { inventoryId: id, validatedData: validatedUpdates })

    // Create Supabase client
    const supabase = await createServerSupabaseClient()

    // Check if inventory exists
    const { data: existingInventory, error: fetchError } = await supabase
      .from("inventory")
      .select("id")
      .eq("id", id)
      .single()

    if (fetchError || !existingInventory) {
      console.error("Inventory not found", { inventoryId: id, error: fetchError })
      return NextResponse.json({ success: false, error: "Inventory not found" }, { status: 404 })
    }

    // Update inventory
    const { data: updatedInventory, error: updateError } = await supabase
      .from("inventory")
      .update(validatedUpdates)
      .eq("id", id)
      .select(`
        id,
        current_stock,
        min_stock,
        max_stock,
        last_restocked,
        product_id,
        location_id
      `)
      .single()

    if (updateError) {
      console.error("Failed to update inventory", { inventoryId: id, error: updateError })
      return NextResponse.json({ success: false, error: "Failed to update inventory" }, { status: 500 })
    }

    console.log("Successfully updated inventory", { inventoryId: id, result: updatedInventory })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedInventory.id,
        currentStock: updatedInventory.current_stock,
        minStock: updatedInventory.min_stock,
        maxStock: updatedInventory.max_stock,
        lastRestocked: updatedInventory.last_restocked,
        productId: updatedInventory.product_id,
        locationId: updatedInventory.location_id,
      },
    })
  } catch (error) {
    console.error("Failed to update inventory", {
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
