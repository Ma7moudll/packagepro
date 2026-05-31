import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const presets: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, format, settings, isDefault } = body

    // If setting as default, unset other defaults
    if (isDefault) {
      presets.forEach((p) => {
        if (p.isDefault) p.isDefault = false
      })
    }

    const preset = {
      id: `preset-${nanoid()}`,
      name,
      description,
      format,
      settings,
      isDefault: isDefault || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    presets.push(preset)

    return NextResponse.json(preset, { status: 201 })
  } catch (error) {
    console.error("Error creating preset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(presets)
  } catch (error) {
    console.error("Error fetching presets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

