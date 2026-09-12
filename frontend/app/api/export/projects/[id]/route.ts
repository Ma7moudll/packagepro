import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const jobs: any[] = []
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

    const body = await request.json()
    const { settings, presetId } = body

    // Create export job
    const job = {
      id: `job-${nanoid()}`,
      projectId: id,
      presetId: presetId || undefined,
      settings: settings || {
        dpi: 300,
        quality: 100,
        colorMode: "cmyk",
        format: "pdf",
        includeBleed: true,
        bleedSize: 3,
        includeCropMarks: true,
        includeColorBars: false,
        includeRegistrationMarks: false,
      },
      status: "pending",
      progress: 0,
      files: [],
      createdAt: new Date().toISOString(),
    }

    jobs.push(job)

    // In production, queue the export job
    // await queueExportJob(job)

    // For now, simulate processing
    setTimeout(() => {
      // Simulate export completion
      const jobIndex = jobs.findIndex((j) => j.id === job.id)
      if (jobIndex !== -1) {
        jobs[jobIndex] = {
          ...jobs[jobIndex],
          status: "completed",
          progress: 100,
          files: [
            {
              id: `file-${nanoid()}`,
              name: `${project.name}-export.pdf`,
              url: `https://example.com/exports/${job.id}/file.pdf`,
              size: 1024000,
              format: "pdf",
            },
          ],
          completedAt: new Date().toISOString(),
        }
      }
    }, 2000)

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error("Error creating export job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

