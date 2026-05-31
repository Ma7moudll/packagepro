import { NextRequest, NextResponse } from "next/server"

// Mock database - would be shared with main templates route
const templates: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const template = templates.find((t) => t.slug === params.slug)

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

