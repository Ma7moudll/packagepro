import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const assets: any[] = []

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters: any = {}

    // Parse filters
    if (searchParams.get("type")) {
      filters.type = JSON.parse(searchParams.get("type")!)
    }
    if (searchParams.get("category")) {
      filters.category = JSON.parse(searchParams.get("category")!)
    }
    if (searchParams.get("tags")) {
      filters.tags = JSON.parse(searchParams.get("tags")!)
    }
    if (searchParams.get("brandId")) {
      filters.brandId = searchParams.get("brandId")
    }
    if (searchParams.get("projectId")) {
      filters.projectId = searchParams.get("projectId")
    }
    if (searchParams.get("isShared")) {
      filters.isShared = searchParams.get("isShared") === "true"
    }
    if (searchParams.get("isPublic")) {
      filters.isPublic = searchParams.get("isPublic") === "true"
    }
    if (searchParams.get("search")) {
      filters.search = searchParams.get("search")
    }

    // Filter assets
    let filtered = assets.filter((asset) => asset.uploadedBy === (session.user as any).id)

    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter((asset) => filters.type.includes(asset.type))
    }

    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter((asset) => filters.category.includes(asset.category))
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((asset) =>
        filters.tags.some((tag: string) => asset.tags.includes(tag))
      )
    }

    if (filters.brandId) {
      filtered = filtered.filter((asset) => asset.brandId === filters.brandId)
    }

    if (filters.projectId) {
      filtered = filtered.filter((asset) =>
        asset.projectIds.includes(filters.projectId)
      )
    }

    if (filters.isShared !== undefined) {
      filtered = filtered.filter((asset) => asset.isShared === filters.isShared)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchLower) ||
          asset.metadata?.title?.toLowerCase().includes(searchLower) ||
          asset.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
      )
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

