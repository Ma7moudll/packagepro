import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const assets: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { type, assetIds, data } = body

    if (!type || !assetIds || assetIds.length === 0) {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 })
    }

    const userId = (session.user as any).id

    // Get assets
    const targetAssets = assets.filter(
      (asset) =>
        assetIds.includes(asset.id) && asset.uploadedBy === userId
    )

    if (targetAssets.length === 0) {
      return NextResponse.json({ error: "No valid assets found" }, { status: 404 })
    }

    // Perform bulk operation
    switch (type) {
      case "delete":
        targetAssets.forEach((asset) => {
          const index = assets.findIndex((a) => a.id === asset.id)
          if (index !== -1) {
            assets.splice(index, 1)
          }
        })
        break

      case "tag":
        if (data?.tags && Array.isArray(data.tags)) {
          targetAssets.forEach((asset) => {
            data.tags.forEach((tag: string) => {
              if (!asset.tags.includes(tag)) {
                asset.tags.push(tag)
              }
            })
            asset.updatedAt = new Date().toISOString()
          })
        }
        break

      case "untag":
        if (data?.tags && Array.isArray(data.tags)) {
          targetAssets.forEach((asset) => {
            asset.tags = asset.tags.filter((tag: string) => !data.tags.includes(tag))
            asset.updatedAt = new Date().toISOString()
          })
        }
        break

      case "category":
        if (data?.category) {
          targetAssets.forEach((asset) => {
            asset.category = data.category
            asset.updatedAt = new Date().toISOString()
          })
        }
        break

      case "share":
        if (data?.projectId) {
          targetAssets.forEach((asset) => {
            if (!asset.projectIds.includes(data.projectId)) {
              asset.projectIds.push(data.projectId)
            }
            asset.isShared = true
            asset.updatedAt = new Date().toISOString()
          })
        }
        break

      case "unshare":
        if (data?.projectId) {
          targetAssets.forEach((asset) => {
            asset.projectIds = asset.projectIds.filter(
              (id: string) => id !== data.projectId
            )
            if (asset.projectIds.length === 0) {
              asset.isShared = false
            }
            asset.updatedAt = new Date().toISOString()
          })
        }
        break

      default:
        return NextResponse.json({ error: "Unknown operation" }, { status: 400 })
    }

    return NextResponse.json({ success: true, count: targetAssets.length })
  } catch (error) {
    console.error("Error performing bulk operation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

