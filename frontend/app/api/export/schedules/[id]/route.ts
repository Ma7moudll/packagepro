import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import parser from "cron-parser"

// Mock database
const schedules: any[] = []

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const schedule = schedules.find((s) => s.id === id)

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    const updates = await request.json()

    // Recalculate next run if schedule changed
    if (updates.schedule && updates.enabled !== false) {
      try {
        const cronExpr = getCronExpression(updates.schedule)
        const interval = (parser as any).parseExpression(cronExpr)
        updates.nextRun = interval.next().toISOString()
      } catch (error) {
        console.error("Error calculating next run:", error)
      }
    }

    Object.assign(schedule, updates, {
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error("Error updating schedule:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const scheduleIndex = schedules.findIndex((s) => s.id === id)

    if (scheduleIndex === -1) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    schedules.splice(scheduleIndex, 1)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getCronExpression(schedule: any): string {
  const { type, time, dayOfWeek, dayOfMonth } = schedule
  const [hours, minutes] = time.split(":")

  switch (type) {
    case "daily":
      return `${minutes} ${hours} * * *`
    case "weekly":
      return `${minutes} ${hours} * * ${dayOfWeek || 1}`
    case "monthly":
      return `${minutes} ${hours} ${dayOfMonth || 1} * *`
    default:
      return schedule.cronExpression || `${minutes} ${hours} * * *`
  }
}

