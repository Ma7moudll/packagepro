import { NextRequest, NextResponse } from "next/server"

// Mock database - In production, use actual database
const templates: any[] = []
let templateIdCounter = 1

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const style = searchParams.get("style")
    const limit = parseInt(searchParams.get("limit") || "20")

    let filtered = [...templates]

    if (category) {
      filtered = filtered.filter((t) => t.category === category)
    }
    if (style) {
      filtered = filtered.filter((t) => t.style === style)
    }

    return NextResponse.json(filtered.slice(0, limit))
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication
    // const session = await getSession()
    // if (!session?.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const body = await request.json()
    const {
      name,
      description,
      category,
      style,
      tags,
      designState,
      thumbnailDataUrl,
    } = body

    if (!name || !description || !category || !style || !designState) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // Create template
    const template = {
      id: `template-${templateIdCounter++}`,
      slug: `${slug}-${Date.now()}`,
      name,
      description,
      category,
      style,
      tags: tags || [],
      designState,
      thumbnailUrl: thumbnailDataUrl || "",
      createdBy: "current-user", // TODO: Get from session
      isPublic: true,
      avgRating: 0,
      ratingsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    templates.push(template)

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

