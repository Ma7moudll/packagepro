import { NextRequest, NextResponse } from "next/server"

// Mock database
const templates: any[] = []

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10")

    // Sort by rating and popularity
    const sorted = [...templates]
      .sort((a, b) => {
        // First by rating
        if (b.avgRating !== a.avgRating) {
          return b.avgRating - a.avgRating
        }
        // Then by number of ratings
        return b.ratingsCount - a.ratingsCount
      })
      .slice(0, limit)

    return NextResponse.json(sorted)
  } catch (error) {
    console.error("Error fetching popular templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

