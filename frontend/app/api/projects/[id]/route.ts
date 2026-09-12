import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const projects: any[] = []

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

    const project = projects.find((p) => p.id === id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check permissions
    if (
      project.ownerId !== (session.user as any).id &&
      !project.sharedWith.some((share: any) => share.userId === (session.user as any).id) &&
      project.visibility !== "public"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching project:", error)
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

    const project = projects.find((p) => p.id === id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check ownership or editor permission
    const share = project.sharedWith.find((s: any) => s.userId === (session.user as any).id)
    if (
      project.ownerId !== (session.user as any).id &&
      (!share || !share.permissions.includes("edit"))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updates = await request.json()
    Object.assign(project, updates, {
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error updating project:", error)
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

    const projectIndex = projects.findIndex((p) => p.id === id)

    if (projectIndex === -1) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const project = projects[projectIndex]

    // Only owner can delete
    if (project.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    projects.splice(projectIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

