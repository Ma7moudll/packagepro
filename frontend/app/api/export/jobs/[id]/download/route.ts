import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const jobs: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const job = jobs.find((j) => j.id === params.id)

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    if (job.status !== "completed") {
      return NextResponse.json({ error: "Job not completed" }, { status: 400 })
    }

    // In production, generate ZIP file from job.files
    // For now, return mock ZIP
    const mockZipContent = `ZIP file for export job ${params.id}`
    const blob = new Blob([mockZipContent], { type: "application/zip" })

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="export-${params.id}.zip"`,
      },
    })
  } catch (error) {
    console.error("Error downloading export:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

