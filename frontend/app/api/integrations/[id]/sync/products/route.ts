import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const integrations: any[] = []
const syncJobs: any[] = []

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

    const integration = integrations.find((i) => i.id === id)

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // Create sync job
    const job = {
      id: `sync-${nanoid()}`,
      integrationId: id,
      type: "products",
      status: "pending",
      progress: 0,
      itemsProcessed: 0,
      itemsTotal: 0,
      createdAt: new Date().toISOString(),
    }

    syncJobs.push(job)

    // In production, queue the sync job
    // await queueSyncJob(job, integration)

    // Simulate sync
    setTimeout(() => {
      const jobIndex = syncJobs.findIndex((j) => j.id === job.id)
      if (jobIndex !== -1) {
        syncJobs[jobIndex] = {
          ...syncJobs[jobIndex],
          status: "completed",
          progress: 100,
          itemsProcessed: 10,
          itemsTotal: 10,
          completedAt: new Date().toISOString(),
        }
      }

      // Update integration last sync
      const integrationIndex = integrations.findIndex((i) => i.id === id)
      if (integrationIndex !== -1) {
        integrations[integrationIndex].lastSync = new Date().toISOString()
      }
    }, 2000)

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error("Error syncing products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

