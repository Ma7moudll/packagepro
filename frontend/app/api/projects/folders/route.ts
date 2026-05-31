import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const folders: any[] = []
const projects: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, parentId, color, icon } = body

    const folder = {
      id: `folder-${nanoid()}`,
      name,
      description,
      parentId,
      color,
      icon,
      projectCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    folders.push(folder)

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error("Error creating folder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Count projects in each folder
    const foldersWithCounts = folders.map((folder) => {
      const count = projects.filter((p) => p.folderId === folder.id).length
      return { ...folder, projectCount: count }
    })

    return NextResponse.json(foldersWithCounts)
  } catch (error) {
    console.error("Error fetching folders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

