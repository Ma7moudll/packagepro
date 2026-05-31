import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock storage - in production, use cloud storage (S3, Cloudinary, etc.)
const assets: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // In production, upload to cloud storage
    // const uploadResult = await uploadToCloudStorage(file)

    // Mock asset creation
    const asset = {
      id: `asset-${nanoid()}`,
      name: formData.get("name") || file.name,
      type: getFileType(file.type),
      mimeType: file.type,
      url: `https://example.com/assets/${nanoid()}`,
      thumbnailUrl: `https://example.com/thumbnails/${nanoid()}`,
      size: file.size,
      width: null,
      height: null,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadedBy: (session.user as any).id || "",
      version: 1,
      currentVersionId: `version-${nanoid()}`,
      category: formData.get("category")?.toString() || undefined,
      tags: formData.get("tags")
        ? JSON.parse(formData.get("tags") as string)
        : [],
      metadata: formData.get("metadata")
        ? JSON.parse(formData.get("metadata") as string)
        : {},
      brandId: formData.get("brandId")?.toString() || undefined,
      projectIds: formData.get("projectId") ? [formData.get("projectId") as string] : [],
      isShared: false,
      isPublic: false,
    }

    assets.push(asset)

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error("Error uploading asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("application/font") || mimeType.includes("font")) return "font"
  if (mimeType.includes("pdf") || mimeType.includes("document")) return "document"
  return "other"
}

