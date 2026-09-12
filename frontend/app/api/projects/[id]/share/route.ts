import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const projects: any[] = []

export async function POST(
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

    // Check ownership
    if (project.ownerId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role, permissions } = body

    const share = {
      id: `share-${nanoid()}`,
      projectId: id,
      userId,
      role,
      permissions: permissions || [],
      sharedAt: new Date().toISOString(),
      sharedBy: (session.user as any).id || "",
    }

    project.sharedWith.push(share)

    return NextResponse.json(share, { status: 201 })
  } catch (error) {
    console.error("Error sharing project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

