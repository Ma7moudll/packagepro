import { NextResponse } from "next/server"

/**
 * Database Status Endpoint
 * GET /api/db-status
 * Returns mock database status (frontend should call backend API instead)
 */
export async function GET() {
  try {
    // Return mock status - in production, this should call the backend API
    return NextResponse.json(
      {
        status: "success",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          status: "operational",
        },
        statistics: {
          users: 0,
          products: 0,
          orders: 0,
          customOrders: 0,
          reviews: 0,
          messages: 0,
          notifications: 0,
          payments: 0,
          priceAlerts: 0,
          sampleRequests: 0,
        },
        defaultUsers: {
          admin: { exists: false },
          manufacturer: { exists: false },
          trader: { exists: false },
        },
        summary: {
          totalUsers: 0,
          totalProducts: 0,
          totalOrders: 0,
          totalReviews: 0,
        },
        note: "This is a mock response. Please use backend API for real data.",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Database status error:", error)

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Failed to get database status",
      },
      { status: 500 },
    )
  }
}
