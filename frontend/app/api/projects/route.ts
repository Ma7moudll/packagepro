import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const projects: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const project = {
      id: `project-${nanoid()}`,
      name: body.name || "Untitled Project",
      description: body.description,
      folderId: body.folderId,
      thumbnailUrl: body.thumbnailUrl,
      status: body.status || "draft",
      visibility: body.visibility || "private",
      ownerId: (session.user as any).id || "",
      teamIds: body.teamIds || [],
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      currentVersionId: `version-${nanoid()}`,
      templateId: body.templateId,
      tags: body.tags || [],
      metadata: body.metadata || {},
    }

    projects.push(project)

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters: any = {}

    if (searchParams.get("folderId")) {
      filters.folderId = searchParams.get("folderId")
    }
    if (searchParams.get("status")) {
      filters.status = JSON.parse(searchParams.get("status")!)
    }
    if (searchParams.get("search")) {
      filters.search = searchParams.get("search")
    }

    // Filter projects
    let filtered = projects.filter(
      (project) =>
        project.ownerId === (session.user as any).id ||
        project.sharedWith.some((share: any) => share.userId === (session.user as any).id) ||
        project.visibility === "public"
    )

    if (filters.folderId) {
      filtered = filtered.filter((project) => project.folderId === filters.folderId)
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((project) => filters.status.includes(project.status))
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

