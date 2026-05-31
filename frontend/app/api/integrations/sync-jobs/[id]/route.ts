import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const syncJobs: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const job = syncJobs.find((j) => j.id === params.id)

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error("Error fetching sync job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

