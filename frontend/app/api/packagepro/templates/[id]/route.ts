import { NextRequest, NextResponse } from "next/server"

// Mock database
const templates: any[] = []
const ratings: any[] = []
let ratingIdCounter = 1

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const template = templates.find((t) => t.id === id)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // TODO: Add authentication and authorization
    const template = templates.find((t) => t.id === id)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const body = await request.json()
    const updates = {
      ...body,
      updatedAt: new Date().toISOString(),
    }

    Object.assign(template, updates)

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // TODO: Add authentication and authorization
    const index = templates.findIndex((t) => t.id === id)

    if (index === -1) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    templates.splice(index, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Ratings endpoints
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // Check if this is a rating request
    const url = request.url
    if (url.includes("/ratings")) {
      const body = await request.json()
      const { rating, comment } = body

      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        )
      }

      const template = templates.find((t) => t.id === id)
      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        )
      }

      // Create rating
      const newRating = {
        id: `rating-${ratingIdCounter++}`,
        templateId: id,
        userId: "current-user", // TODO: Get from session
        userName: "User", // TODO: Get from session
        rating,
        comment: comment || "",
        createdAt: new Date().toISOString(),
      }

      ratings.push(newRating)

      // Update template rating stats
      const templateRatings = ratings.filter((r) => r.templateId === id)
      const totalRating = templateRatings.reduce((sum, r) => sum + r.rating, 0)
      template.avgRating = totalRating / templateRatings.length
      template.ratingsCount = templateRatings.length

      return NextResponse.json(newRating, { status: 201 })
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Error adding rating:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

