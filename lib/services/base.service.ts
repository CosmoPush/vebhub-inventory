import type { SupabaseClient } from "@supabase/supabase-js"
import { VendHubError } from "@/lib/types/domain"
import { Logger } from "@/lib/utils/logger"

export abstract class BaseService {
  protected readonly logger: Logger

  constructor(
    protected readonly db: SupabaseClient,
    protected readonly serviceName: string,
  ) {
    this.logger = new Logger(serviceName)
  }

  protected async executeQuery<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    errorMessage: string,
  ): Promise<T> {
    try {
      const { data, error } = await operation()

      if (error) {
        this.logger.error(`Database error in ${this.serviceName}`, { error, errorMessage })
        throw new VendHubError(`${errorMessage}: ${error.message}`, "DATABASE_ERROR", 500, { originalError: error })
      }

      if (data === null) {
        throw new VendHubError(errorMessage, "NOT_FOUND", 404)
      }

      return data
    } catch (error) {
      if (error instanceof VendHubError) {
        throw error
      }

      this.logger.error(`Unexpected error in ${this.serviceName}`, { error, errorMessage })
      throw new VendHubError("An unexpected error occurred", "INTERNAL_ERROR", 500, { originalError: error })
    }
  }

  protected async executeCommand(operation: () => Promise<{ error: any }>, errorMessage: string): Promise<void> {
    try {
      const { error } = await operation()

      if (error) {
        this.logger.error(`Database error in ${this.serviceName}`, { error, errorMessage })
        throw new VendHubError(`${errorMessage}: ${error.message}`, "DATABASE_ERROR", 500, { originalError: error })
      }
    } catch (error) {
      if (error instanceof VendHubError) {
        throw error
      }

      this.logger.error(`Unexpected error in ${this.serviceName}`, { error, errorMessage })
      throw new VendHubError("An unexpected error occurred", "INTERNAL_ERROR", 500, { originalError: error })
    }
  }
}
