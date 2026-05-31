import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const versions: any[] = []
const assets: any[] = []

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const asset = assets.find((a) => a.id === params.id)

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Check ownership
    if (asset.uploadedBy !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const version = versions.find((v) => v.id === params.versionId && v.assetId === params.id)

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    // Mark previous version as not current
    const previousVersions = versions.filter(
      (v) => v.assetId === params.id && v.isCurrent
    )
    previousVersions.forEach((v) => {
      v.isCurrent = false
    })

    // Mark selected version as current
    version.isCurrent = true

    // Update asset
    asset.currentVersionId = version.id
    asset.url = version.url
    asset.thumbnailUrl = version.thumbnailUrl
    asset.size = version.size
    asset.updatedAt = new Date().toISOString()

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Error restoring version:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

