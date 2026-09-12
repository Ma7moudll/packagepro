import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const assets: any[] = []

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

    const asset = assets.find((a) => a.id === id)

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Check permissions
    if (asset.uploadedBy !== (session.user as any).id && !asset.isShared && !asset.isPublic) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Error fetching asset:", error)
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

    const asset = assets.find((a) => a.id === id)

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Check ownership
    if (asset.uploadedBy !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updates = await request.json()
    Object.assign(asset, updates, {
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Error updating asset:", error)
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

    const assetIndex = assets.findIndex((a) => a.id === id)

    if (assetIndex === -1) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const asset = assets[assetIndex]

    // Check ownership
    if (asset.uploadedBy !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // In production, delete from cloud storage
    assets.splice(assetIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

