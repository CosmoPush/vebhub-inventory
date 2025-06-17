import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { VendHubError } from "@/lib/types/domain"

interface DatabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey: string
}

class DatabaseConnection {
  private static instance: DatabaseConnection
  private clientConnection: SupabaseClient | null = null
  private adminConnection: SupabaseClient | null = null
  private readonly config: DatabaseConfig

  private constructor() {
    this.config = this.validateConfig()
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection()
    }
    return DatabaseConnection.instance
  }

  private validateConfig(): DatabaseConfig {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://feeoklcyjsumzxrudnwg.supabase.co"
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZW9rbGN5anN1bXp4cnVkbndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzg4NjMsImV4cCI6MjA2NTY1NDg2M30.nLfjzVe7Qv4HWOfiBudh_nr3kXQd6j_0oHJCU7Mr8SM"
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZW9rbGN5anN1bXp4cnVkbndnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDA3ODg2MywiZXhwIjoyMDY1NjU0ODYzfQ.RMTPNu8VlmNCWDfEEqG0KCs1RfHt3nobkVrk0UVEPsQ"

    if (!url || !anonKey || !serviceRoleKey) {
      throw new VendHubError("Missing required database configuration", "CONFIG_ERROR", 500, {
        url: !!url,
        anonKey: !!anonKey,
        serviceRoleKey: !!serviceRoleKey,
      })
    }

    return { url, anonKey, serviceRoleKey }
  }

  public getClient(): SupabaseClient {
    if (!this.clientConnection) {
      this.clientConnection = createClient(this.config.url, this.config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        db: {
          schema: "public",
        },
      })
    }
    return this.clientConnection
  }

  public getAdminClient(): SupabaseClient {
    if (!this.adminConnection) {
      this.adminConnection = createClient(this.config.url, this.config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: "public",
        },
      })
    }
    return this.adminConnection
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.getClient().from("locations").select("count", { count: "exact", head: true })
      return !error
    } catch {
      return false
    }
  }
}

export const db = DatabaseConnection.getInstance()
export const supabase = db.getClient()
export const supabaseAdmin = db.getAdminClient()
