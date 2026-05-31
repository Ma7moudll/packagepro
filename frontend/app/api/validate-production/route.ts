import { type NextRequest, NextResponse } from "next/server"
import { validateProductionReadiness } from "@/lib/production-checklist"

export async function GET(request: NextRequest) {
  // Only allow in development or from authorized sources
  const isAuthorized =
    process.env.NODE_ENV === "development" || request.headers.get("x-api-key") === process.env.PRODUCTION_API_KEY

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }

  const validation = validateProductionReadiness()

  return NextResponse.json(
    {
      ready: validation.ready,
      issues: validation.issues,
      warnings: validation.warnings,
      timestamp: new Date().toISOString(),
    },
    {
      status: validation.ready ? 200 : 400,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  )
}
