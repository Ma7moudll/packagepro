import { NextRequest, NextResponse } from "next/server"

// Mock database - In production, use Algolia/Elasticsearch
const templates: any[] = []

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const category = searchParams.get("category")
    const style = searchParams.get("style")
    const minRating = parseFloat(searchParams.get("minRating") || "0")
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || []
    const q = searchParams.get("q")?.toLowerCase() || ""

    // Filter templates
    let filtered = [...templates]

    // Category filter
    if (category) {
      filtered = filtered.filter((t) => t.category === category)
    }

    // Style filter
    if (style) {
      filtered = filtered.filter((t) => t.style === style)
    }

    // Rating filter
    if (minRating > 0) {
      filtered = filtered.filter((t) => t.avgRating >= minRating)
    }

    // Tags filter
    if (tags.length > 0) {
      filtered = filtered.filter((t) =>
        tags.some((tag) => t.tags?.includes(tag))
      )
    }

    // Search query
    if (q) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags?.some((tag: string) => tag.toLowerCase().includes(q))
      )
    }

    // Sort by rating and popularity
    filtered.sort((a, b) => {
      if (b.avgRating !== a.avgRating) {
        return b.avgRating - a.avgRating
      }
      return b.ratingsCount - a.ratingsCount
    })

    // Pagination
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginated = filtered.slice(start, end)

    return NextResponse.json({
      templates: paginated,
      total: filtered.length,
      page,
      pageSize,
    })
  } catch (error) {
    console.error("Error searching templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

