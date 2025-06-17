import type { ApiResponse } from "@/lib/types/domain"
import { VendHubError } from "@/lib/types/domain"
import { Logger } from "./logger"

const logger = new Logger("ResponseUtils")

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }
}

export function createErrorResponse(error: unknown): ApiResponse {
  logger.error("Creating error response", { error })

  if (error instanceof VendHubError) {
    return {
      success: false,
      error: error.message,
      details: error.details || undefined,
      code: error.code,
      timestamp: new Date().toISOString(),
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }

  return {
    success: false,
    error: "An unexpected error occurred",
    timestamp: new Date().toISOString(),
  }
}

export function handleApiError(error: unknown): Response {
  const errorResponse = createErrorResponse(error)

  let statusCode = 500
  if (error instanceof VendHubError) {
    statusCode = error.statusCode
  }

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
  })
}
