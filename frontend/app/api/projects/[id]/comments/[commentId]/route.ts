import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const comments: any[] = []

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const comment = comments.find((c) => c.id === commentId && c.projectId === id)

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    // Check ownership
    if (comment.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updates = await request.json()
    Object.assign(comment, updates, {
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error("Error updating comment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const commentIndex = comments.findIndex(
      (c) => c.id === commentId && c.projectId === id
    )

    if (commentIndex === -1) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    const comment = comments[commentIndex]

    // Check ownership
    if (comment.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    comments.splice(commentIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

