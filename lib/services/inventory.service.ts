import type { SupabaseClient } from "@supabase/supabase-js"
import { BaseService } from "./base.service"
import type {
  Inventory,
  InventoryWithDetails,
  LocationWithInventory,
  UpdateInventoryDTO,
  StockStatus,
} from "@/lib/types/domain"
import { ValidationError } from "@/lib/types/domain"

export class InventoryService extends BaseService {
  constructor(db: SupabaseClient) {
    super(db, "InventoryService")
  }

  async getLocationInventory(locationId: string): Promise<InventoryWithDetails[]> {
    const inventory = await this.executeQuery(
      () =>
        this.db
          .from("inventory")
          .select(`
          *,
          location:locations(*),
          product:products(*)
        `)
          .eq("location_id", locationId),
      "Failed to fetch location inventory",
    )

    return inventory.map(this.mapToInventoryWithDetails)
  }

  async getLocationWithInventory(locationId: string): Promise<LocationWithInventory> {
    const [location, inventory] = await Promise.all([
      this.executeQuery(
        () => this.db.from("locations").select("*").eq("id", locationId).single(),
        "Location not found",
      ),
      this.getLocationInventory(locationId),
    ])

    const lowStockCount = inventory.filter((inv) => inv.stockStatus === "low" || inv.stockStatus === "out").length
    const stockStatus = this.calculateLocationStockStatus(inventory)

    return {
      ...location,
      locationCode: location.location_code,
      inventory,
      lowStockCount,
      totalProducts: inventory.length,
      stockStatus,
    }
  }

  async getAllLocationsWithInventory(): Promise<LocationWithInventory[]> {
    const locations = await this.executeQuery(
      () =>
        this.db.from("locations").select(`
        *,
        inventory (
          *,
          product:products (*)
        )
      `),
      "Failed to fetch locations with inventory",
    )

    return locations.map((location) => {
      const inventory = (location.inventory || []).map(this.mapToInventoryWithDetails)
      const lowStockCount = inventory.filter((inv) => inv.stockStatus === "low" || inv.stockStatus === "out").length
      const stockStatus = this.calculateLocationStockStatus(inventory)

      return {
        ...location,
        locationCode: location.location_code,
        inventory,
        lowStockCount,
        totalProducts: inventory.length,
        stockStatus,
      }
    })
  }

  async updateInventory(inventoryId: string, updates: UpdateInventoryDTO): Promise<Inventory> {
    this.validateInventoryUpdates(updates)

    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.currentStock !== undefined) {
      dbUpdates.current_stock = updates.currentStock
    }
    if (updates.minStock !== undefined) {
      dbUpdates.min_stock = updates.minStock
    }
    if (updates.maxStock !== undefined) {
      dbUpdates.max_stock = updates.maxStock
    }

    try {
      const { data: updatedInventory, error } = await this.db
        .from("inventory")
        .update(dbUpdates)
        .eq("id", inventoryId)
        .select()
        .single()

      if (error) {
        throw error
      }

      if (!updatedInventory) {
        throw new Error("No inventory record returned after update")
      }

      return updatedInventory
    } catch (error) {
      throw error
    }
  }

  async updateInventoryByLocationAndProduct(
    locationId: string,
    productId: string,
    quantityChange: number,
  ): Promise<void> {
    try {
      const { data: currentInventory, error: fetchError } = await this.db
        .from("inventory")
        .select("*")
        .eq("location_id", locationId)
        .eq("product_id", productId)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError
      }

      if (currentInventory) {
        const newStock = Math.max(0, currentInventory.current_stock + quantityChange)

        const { error: updateError } = await this.db
          .from("inventory")
          .update({
            current_stock: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentInventory.id)

        if (updateError) {
          throw updateError
        }
      } else {
        const initialStock = Math.max(0, 20 + quantityChange)

        const { error: insertError } = await this.db.from("inventory").insert({
          location_id: locationId,
          product_id: productId,
          current_stock: initialStock,
          min_stock: 5,
          max_stock: 50,
        })

        if (insertError) {
          throw insertError
        }
      }
    } catch (error) {
      throw error
    }
  }

  async getLowStockItems(limit = 50): Promise<InventoryWithDetails[]> {
    const inventory = await this.executeQuery(
      () =>
        this.db
          .from("inventory")
          .select(`
          *,
          location:locations(*),
          product:products(*)
        `)
          .lte("current_stock", this.db.raw("min_stock"))
          .order("current_stock", { ascending: true })
          .limit(limit),
      "Failed to fetch low stock items",
    )

    return inventory.map(this.mapToInventoryWithDetails)
  }

  private validateInventoryUpdates(updates: UpdateInventoryDTO): void {
    if (updates.currentStock !== undefined && updates.currentStock < 0) {
      throw new ValidationError("Current stock cannot be negative")
    }

    if (updates.minStock !== undefined && updates.minStock < 0) {
      throw new ValidationError("Minimum stock cannot be negative")
    }

    if (updates.maxStock !== undefined && updates.maxStock < 0) {
      throw new ValidationError("Maximum stock cannot be negative")
    }

    if (updates.minStock !== undefined && updates.maxStock !== undefined && updates.minStock > updates.maxStock) {
      throw new ValidationError("Minimum stock cannot be greater than maximum stock")
    }
  }

  private mapToInventoryWithDetails = (inv: any): InventoryWithDetails => ({
    ...inv,
    stockStatus: this.calculateStockStatus(inv.current_stock, inv.min_stock),
  })

  private calculateStockStatus(currentStock: number, minStock: number): StockStatus {
    if (currentStock === 0) return "out"
    if (currentStock <= minStock) return "low"
    return "good"
  }

  private calculateLocationStockStatus(inventory: InventoryWithDetails[]): StockStatus {
    const outOfStockCount = inventory.filter((inv) => inv.stockStatus === "out").length
    const lowStockCount = inventory.filter((inv) => inv.stockStatus === "low").length

    if (outOfStockCount > 0) return "out"
    if (lowStockCount > 0) return "low"
    return "good"
  }
}
