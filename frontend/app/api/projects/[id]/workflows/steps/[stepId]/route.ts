import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const workflows: any[] = []
const projects: any[] = []

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workflow = workflows.find((w) => w.projectId === params.id)

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const step = workflow.steps.find((s: any) => s.id === params.stepId)

    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 })
    }

    // Check if user is the approver
    if (step.approverId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if step is current
    const currentStep = workflow.steps[workflow.currentStepIndex]
    if (step.id !== currentStep.id) {
      return NextResponse.json({ error: "Step is not current" }, { status: 400 })
    }

    const body = await request.json()
    const { approved, comments } = body

    // Update step
    step.status = approved ? "approved" : "rejected"
    step.comments = comments
    step.completedAt = new Date().toISOString()

    if (approved) {
      // Move to next step
      if (workflow.currentStepIndex < workflow.steps.length - 1) {
        workflow.currentStepIndex++
        workflow.steps[workflow.currentStepIndex].status = "pending"
        workflow.status = "in-progress"
      } else {
        // All steps approved
        workflow.status = "approved"
        workflow.completedAt = new Date().toISOString()

        // Update project status
        const project = projects.find((p) => p.id === params.id)
        if (project) {
          project.status = "approved"
        }
      }
    } else {
      // Rejected
      workflow.status = "rejected"
      workflow.completedAt = new Date().toISOString()

      // Update project status
      const project = projects.find((p) => p.id === params.id)
      if (project) {
        project.status = "rejected"
      }
    }

    workflow.updatedAt = new Date().toISOString()

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("Error approving step:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

