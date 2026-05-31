import { NextResponse, type NextRequest } from "next/server"
import { MonitoringService } from "./monitoring"

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function handleApiError(error: unknown, request?: NextRequest) {
  console.error("API Error:", error)

  // Log to monitoring service
  if (error instanceof Error) {
    MonitoringService.captureException(error, {
      url: request?.url,
      method: request?.method,
    })
  }

  // Handle different error types
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode },
    )
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      {
        error: "Invalid request format",
      },
      { status: 400 },
    )
  }

  // Default error response
  return NextResponse.json(
    {
      error: process.env.NODE_ENV === "development" ? (error as Error).message : "Internal server error",
    },
    { status: 500 },
  )
}
