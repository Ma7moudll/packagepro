import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/public/stats`, {
      cache: "no-store",
    })
    const data = await response.json()

    if (!response.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.message || "Failed to fetch stats" },
        { status: response.status }
      )
    }

    const stats = data.data

    return NextResponse.json({
      success: true,
      stats: {
        completedDeals: {
          value: stats.completedDeals.value,
          raw: stats.completedDeals.value,
        },
        registeredFactories: {
          value: stats.registeredFactories.value,
          raw: stats.registeredFactories.value,
        },
        transactionVolume: {
          value: stats.transactionVolume.value,
          raw: stats.transactionVolume.value,
        },
        activeTraders: {
          value: stats.activeTraders.value,
          raw: stats.activeTraders.value,
        },
        categories: stats.categories || {},
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      stats: {
        completedDeals: { value: 0, raw: 0 },
        registeredFactories: { value: 0, raw: 0 },
        transactionVolume: { value: 0, raw: 0 },
        activeTraders: { value: 0, raw: 0 },
      },
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}