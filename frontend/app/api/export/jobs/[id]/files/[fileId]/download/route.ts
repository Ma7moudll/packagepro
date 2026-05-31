import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const jobs: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
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

    const file = job.files.find((f: any) => f.id === params.fileId)

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // In production, fetch file from storage
    // For now, return mock file
    const mockFileContent = `File content for ${file.name}`
    const blob = new Blob([mockFileContent], { type: `application/${file.format}` })

    return new NextResponse(blob, {
      headers: {
        "Content-Type": `application/${file.format}`,
        "Content-Disposition": `attachment; filename="${file.name}"`,
      },
    })
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

