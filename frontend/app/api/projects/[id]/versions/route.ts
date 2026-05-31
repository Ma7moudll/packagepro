import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const projects: any[] = []
const versions: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projectVersions = versions.filter((v) => v.projectId === params.id)

    return NextResponse.json(projectVersions)
  } catch (error) {
    console.error("Error fetching versions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json()
    const { name, description, snapshot, changeLog, tags } = body

    // Mark previous version as not current
    const previousVersions = versions.filter(
      (v) => v.projectId === params.id && v.isCurrent
    )
    previousVersions.forEach((v) => {
      v.isCurrent = false
    })

    const newVersion = {
      id: `version-${nanoid()}`,
      projectId: params.id,
      version: project.version + 1,
      name,
      description,
      snapshot: snapshot || {},
      createdAt: new Date().toISOString(),
      createdBy: (session.user as any).id || "",
      changeLog,
      tags: tags || [],
      isCurrent: true,
    }

    versions.push(newVersion)

    // Update project
    project.version = newVersion.version
    project.currentVersionId = newVersion.id
    project.updatedAt = new Date().toISOString()

    return NextResponse.json(newVersion, { status: 201 })
  } catch (error) {
    console.error("Error creating version:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

