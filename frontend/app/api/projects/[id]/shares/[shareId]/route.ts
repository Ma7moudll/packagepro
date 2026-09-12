import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const projects: any[] = []

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  const { id, shareId } = await params
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

    project.sharedWith = project.sharedWith.filter(
      (share: any) => share.id !== shareId
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing share:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

