import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const jobs: any[] = []
const projects: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { projectIds, presetId, settings, outputFormat, cloudStorage } = body

    if (!projectIds || projectIds.length === 0) {
      return NextResponse.json({ error: "No projects specified" }, { status: 400 })
    }

    // Create batch export job
    const job = {
      id: `job-${nanoid()}`,
      projectIds,
      presetId: presetId || undefined,
      settings: settings || {
        dpi: 300,
        quality: 100,
        colorMode: "cmyk",
        format: outputFormat === "zip" ? "zip" : "pdf",
        includeBleed: true,
        bleedSize: 3,
        includeCropMarks: true,
        includeColorBars: false,
        includeRegistrationMarks: false,
      },
      outputFormat: outputFormat || "zip",
      cloudStorage: cloudStorage || undefined,
      status: "pending",
      progress: 0,
      files: [],
      createdAt: new Date().toISOString(),
    }

    jobs.push(job)

    // In production, queue the batch export job
    // await queueBatchExportJob(job)

    // For now, simulate processing
    setTimeout(() => {
      const jobIndex = jobs.findIndex((j) => j.id === job.id)
      if (jobIndex !== -1) {
        const exportedFiles = projectIds.map((projectId: string, index: number) => ({
          id: `file-${nanoid()}`,
          name: `project-${projectId}-export.pdf`,
          url: `https://example.com/exports/${job.id}/file-${index}.pdf`,
          size: 1024000,
          format: "pdf",
        }))

        jobs[jobIndex] = {
          ...jobs[jobIndex],
          status: "completed",
          progress: 100,
          files: outputFormat === "zip"
            ? [
              {
                id: `file-${nanoid()}`,
                name: `batch-export-${job.id}.zip`,
                url: `https://example.com/exports/${job.id}/batch.zip`,
                size: exportedFiles.reduce((sum: number, f: any) => sum + f.size, 0),
                format: "zip",
              },
            ]
            : exportedFiles,
          completedAt: new Date().toISOString(),
        }
      }
    }, 3000)

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error("Error creating batch export:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

