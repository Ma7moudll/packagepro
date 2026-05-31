import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const presets: any[] = []

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const preset = presets.find((p) => p.id === params.id)

    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 })
    }

    const updates = await request.json()

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      presets.forEach((p) => {
        if (p.id !== params.id && p.isDefault) p.isDefault = false
      })
    }

    Object.assign(preset, updates, {
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json(preset)
  } catch (error) {
    console.error("Error updating preset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const presetIndex = presets.findIndex((p) => p.id === params.id)

    if (presetIndex === -1) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 })
    }

    presets.splice(presetIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting preset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

