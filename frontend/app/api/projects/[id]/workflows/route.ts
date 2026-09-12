import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const projects: any[] = []
const workflows: any[] = []

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

    const workflow = workflows.find((w) => w.projectId === id)

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("Error fetching workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    const { name, steps } = body

    const workflow = {
      id: `workflow-${nanoid()}`,
      projectId: id,
      name: name || "Approval Workflow",
      steps: steps.map((step: any, index: number) => ({
        ...step,
        id: step.id || `step-${nanoid()}`,
        order: step.order || index + 1,
        status: "pending",
      })),
      currentStepIndex: 0,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    workflows.push(workflow)

    // Update project status
    project.status = "review"

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    console.error("Error creating workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

