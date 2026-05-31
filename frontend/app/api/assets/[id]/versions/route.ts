import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const versions: any[] = []
const assets: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const assetVersions = versions.filter((v) => v.assetId === params.id)

    return NextResponse.json(assetVersions)
  } catch (error) {
    console.error("Error fetching versions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const changeLog = formData.get("changeLog")?.toString()

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // In production, upload to cloud storage
    // const uploadResult = await uploadToCloudStorage(file)

    // Create new version
    const newVersion = {
      id: `version-${nanoid()}`,
      assetId: params.id,
      version: asset.version + 1,
      url: `https://example.com/assets/${nanoid()}`,
      thumbnailUrl: `https://example.com/thumbnails/${nanoid()}`,
      size: file.size,
      createdAt: new Date().toISOString(),
      createdBy: (session.user as any).id || "",
      changeLog: changeLog || undefined,
      isCurrent: false,
    }

    versions.push(newVersion)

    // Update asset
    asset.version = newVersion.version
    asset.currentVersionId = newVersion.id
    asset.updatedAt = new Date().toISOString()

    // Mark previous version as not current
    const previousVersions = versions.filter(
      (v) => v.assetId === params.id && v.isCurrent
    )
    previousVersions.forEach((v) => {
      v.isCurrent = false
    })

    newVersion.isCurrent = true

    return NextResponse.json(newVersion, { status: 201 })
  } catch (error) {
    console.error("Error creating version:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

