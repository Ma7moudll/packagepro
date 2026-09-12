import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const projects: any[] = []
const comments: any[] = []

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

    // Check permissions
    if (
      project.ownerId !== (session.user as any).id &&
      !project.sharedWith.some((share: any) => share.userId === (session.user as any).id) &&
      project.visibility !== "public"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      userId,
      userName,
      userAvatar,
      content,
      type,
      position,
      mentions,
      attachments,
    } = body

    const comment = {
      id: `comment-${nanoid()}`,
      projectId: id,
      userId,
      userName,
      userAvatar,
      content,
      type: type || "comment",
      status: "open",
      position,
      replies: [],
      mentions: mentions || [],
      attachments: attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    comments.push(comment)

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error adding comment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const projectComments = comments.filter((c) => c.projectId === id)

    return NextResponse.json(projectComments)
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

