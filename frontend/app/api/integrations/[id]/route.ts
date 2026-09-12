import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const integrations: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integration = integrations.find((i) => i.id === id)

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    return NextResponse.json(integration)
  } catch (error) {
    console.error("Error fetching integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integration = integrations.find((i) => i.id === id)

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const updates = await request.json()
    Object.assign(integration, updates, {
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json(integration)
  } catch (error) {
    console.error("Error updating integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integrationIndex = integrations.findIndex((i) => i.id === id)

    if (integrationIndex === -1) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    integrations.splice(integrationIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

