import type { SupabaseClient } from "@supabase/supabase-js"
import { BaseService } from "./base.service"

// Define types locally to avoid import issues
interface Location {
  id: string
  name: string
  location_code: string
  address: string | null
  updated_at: string
}

interface CreateLocationDTO {
  name: string
  locationCode: string
  address?: string
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

export class LocationService extends BaseService {
  constructor(db: SupabaseClient) {
    super(db, "LocationService")
  }

  async findById(id: string): Promise<Location> {
    console.log("Finding location by ID", { id })

    const { data, error } = await this.db.from("locations").select("*").eq("id", id).single()

    if (error) {
      throw new Error(`Location not found: ${error.message}`)
    }

    if (!data) {
      throw new Error("Location not found")
    }

    return data
  }

  async findByCode(locationCode: string): Promise<Location | null> {
    console.log("Finding location by code", { locationCode })

    const { data, error } = await this.db.from("locations").select("*").eq("location_code", locationCode).single()

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to find location: ${error.message}`)
    }

    return data || null
  }

  async findOrCreateByCode(locationCode: string, name: string, address?: string): Promise<Location> {
    console.log("Finding or creating location by code", { locationCode, name })

    try {
      // Try to find existing location with normalized code
      const normalizedCode = locationCode.replace(/^2\.0_/, "")

      const { data: existingLocation, error: findError } = await this.db
        .from("locations")
        .select("*")
        .or(`location_code.eq.${locationCode},location_code.eq.${normalizedCode}`)
        .single()

      if (existingLocation && !findError) {
        console.log("Found existing location", {
          locationId: existingLocation.id,
          locationCode: existingLocation.location_code,
        })
        return existingLocation
      }

      // Create new location
      console.log("Creating new location", { locationCode, name, address })

      const { data: newLocation, error: createError } = await this.db
        .from("locations")
        .insert({
          location_code: locationCode,
          name,
          address: address || null,
        })
        .select()
        .single()

      if (createError) {
        console.error("Failed to create location", { createError, locationCode, name })
        throw createError
      }

      if (!newLocation) {
        throw new Error("No location returned after creation")
      }

      console.log("Successfully created new location", {
        locationId: newLocation.id,
        locationCode: newLocation.location_code,
        name: newLocation.name,
      })

      return newLocation
    } catch (error) {
      console.error("Error in findOrCreateByCode", { error, locationCode, name })
      throw error
    }
  }

  async create(locationData: CreateLocationDTO): Promise<Location> {
    console.log("Creating location", { locationData })

    this.validateLocationData(locationData)

    const { data, error } = await this.db
      .from("locations")
      .insert({
        name: locationData.name,
        location_code: locationData.locationCode,
        address: locationData.address || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create location: ${error.message}`)
    }

    if (!data) {
      throw new Error("No location returned after creation")
    }

    return data
  }

  async getAll(): Promise<Location[]> {
    console.log("Fetching all locations")

    const { data, error } = await this.db.from("locations").select("*").order("name")

    if (error) {
      throw new Error(`Failed to fetch locations: ${error.message}`)
    }

    return data || []
  }

  async update(id: string, updates: Partial<CreateLocationDTO>): Promise<Location> {
    console.log("Updating location", { id, updates })

    if (updates.locationCode) {
      this.validateLocationCode(updates.locationCode)
    }

    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.name) {
      dbUpdates.name = updates.name
    }
    if (updates.locationCode) {
      dbUpdates.location_code = updates.locationCode
    }
    if (updates.address !== undefined) {
      dbUpdates.address = updates.address
    }

    const { data, error } = await this.db.from("locations").update(dbUpdates).eq("id", id).select().single()

    if (error) {
      throw new Error(`Failed to update location: ${error.message}`)
    }

    if (!data) {
      throw new Error("No location returned after update")
    }

    return data
  }

  async delete(id: string): Promise<void> {
    console.log("Deleting location", { id })

    const { error } = await this.db.from("locations").delete().eq("id", id)

    if (error) {
      throw new Error(`Failed to delete location: ${error.message}`)
    }
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
