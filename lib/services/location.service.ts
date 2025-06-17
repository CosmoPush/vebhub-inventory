import type { SupabaseClient } from "@supabase/supabase-js"
import { BaseService } from "./base.service"
import type { Location, CreateLocationDTO } from "@/lib/types/domain"
import { ValidationError } from "@/lib/types/domain"

export class LocationService extends BaseService {
  constructor(db: SupabaseClient) {
    super(db, "LocationService")
  }

  async findById(id: string): Promise<Location> {
    this.logger.info("Finding location by ID", { id })

    return await this.executeQuery(
      () => this.db.from("locations").select("*").eq("id", id).single(),
      "Location not found",
    )
  }

  async findByCode(locationCode: string): Promise<Location | null> {
    this.logger.info("Finding location by code", { locationCode })

    const { data } = await this.db.from("locations").select("*").eq("location_code", locationCode).single()

    return data
  }

  async findOrCreateByCode(locationCode: string, name: string, address?: string): Promise<Location> {
    this.logger.info("Finding or creating location by code", { locationCode, name })

    try {
      // Try to find existing location with normalized code
      const normalizedCode = locationCode.replace(/^2\.0_/, "")

      const { data: existingLocation, error: findError } = await this.db
        .from("locations")
        .select("*")
        .or(`location_code.eq.${locationCode},location_code.eq.${normalizedCode}`)
        .single()

      if (existingLocation && !findError) {
        this.logger.info("Found existing location", {
          locationId: existingLocation.id,
          locationCode: existingLocation.location_code,
        })
        return existingLocation
      }

      // Create new location
      this.logger.info("Creating new location", { locationCode, name, address })

      const { data: newLocation, error: createError } = await this.db
        .from("locations")
        .insert({
          location_code: locationCode,
          name,
          address,
        })
        .select()
        .single()

      if (createError) {
        this.logger.error("Failed to create location", { createError, locationCode, name })
        throw createError
      }

      if (!newLocation) {
        throw new Error("No location returned after creation")
      }

      this.logger.info("Successfully created new location", {
        locationId: newLocation.id,
        locationCode: newLocation.location_code,
        name: newLocation.name,
      })

      return newLocation
    } catch (error) {
      this.logger.error("Error in findOrCreateByCode", { error, locationCode, name })
      throw error
    }
  }

  async create(locationData: CreateLocationDTO): Promise<Location> {
    this.logger.info("Creating location", { locationData })

    this.validateLocationData(locationData)

    return await this.executeQuery(
      () => this.db.from("locations").insert(locationData).select().single(),
      "Failed to create location",
    )
  }

  async getAll(): Promise<Location[]> {
    this.logger.info("Fetching all locations")

    return await this.executeQuery(
      () => this.db.from("locations").select("*").order("name"),
      "Failed to fetch locations",
    )
  }

  async update(id: string, updates: Partial<CreateLocationDTO>): Promise<Location> {
    this.logger.info("Updating location", { id, updates })

    if (updates.locationCode) {
      this.validateLocationCode(updates.locationCode)
    }

    return await this.executeQuery(
      () =>
        this.db
          .from("locations")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single(),
      "Failed to update location",
    )
  }

  async delete(id: string): Promise<void> {
    this.logger.info("Deleting location", { id })

    await this.executeCommand(() => this.db.from("locations").delete().eq("id", id), "Failed to delete location")
  }

  private validateLocationData(data: CreateLocationDTO): void {
    if (!data.locationCode?.trim()) {
      throw new ValidationError("Location code is required")
    }

    if (!data.name?.trim()) {
      throw new ValidationError("Location name is required")
    }

    this.validateLocationCode(data.locationCode)
  }

  private validateLocationCode(locationCode: string): void {
    if (locationCode.length > 50) {
      throw new ValidationError("Location code must be 50 characters or less")
    }

    if (!/^[A-Za-z0-9._-]+$/.test(locationCode)) {
      throw new ValidationError("Location code can only contain letters, numbers, dots, underscores, and hyphens")
    }
  }
}
