import { NextRequest, NextResponse } from "next/server"

// Mock database
const ratings: any[] = []
let ratingIdCounter = 1

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateRatings = ratings.filter((r) => r.templateId === params.id)
    return NextResponse.json(templateRatings)
  } catch (error) {
    console.error("Error fetching ratings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add authentication
    const body = await request.json()
    const { rating, comment } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      )
    }

    // Create rating
    const newRating = {
      id: `rating-${ratingIdCounter++}`,
      templateId: params.id,
      userId: "current-user", // TODO: Get from session
      userName: "User", // TODO: Get from session
      rating,
      comment: comment || "",
      createdAt: new Date().toISOString(),
    }

    ratings.push(newRating)

    // Update template rating (would need to fetch template and update)
    // This is simplified - in production, use database transaction

    return NextResponse.json(newRating, { status: 201 })
  } catch (error) {
    console.error("Error adding rating:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

