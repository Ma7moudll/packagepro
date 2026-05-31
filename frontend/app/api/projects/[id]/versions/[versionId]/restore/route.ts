import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const projects: any[] = []
const versions: any[] = []

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const project = projects.find((p) => p.id === params.id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check permissions
    const share = project.sharedWith.find((s: any) => s.userId === (session.user as any).id)
    if (
      project.ownerId !== (session.user as any).id &&
      (!share || !share.permissions.includes("edit"))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const version = versions.find((v) => v.id === params.versionId && v.projectId === params.id)

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    // Mark previous version as not current
    const previousVersions = versions.filter(
      (v) => v.projectId === params.id && v.isCurrent
    )
    previousVersions.forEach((v) => {
      v.isCurrent = false
    })

    // Mark selected version as current
    version.isCurrent = true

    // Restore project state from version snapshot
    // In production, restore design state from snapshot
    project.currentVersionId = version.id
    project.updatedAt = new Date().toISOString()

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error restoring version:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

