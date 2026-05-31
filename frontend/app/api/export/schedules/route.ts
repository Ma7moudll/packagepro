import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"
import parser from "cron-parser"


// Mock database
const schedules: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, projectId, presetId, settings, schedule, cloudStorage, enabled } = body

    // Calculate next run time
    let nextRun: string | undefined
    if (enabled && schedule) {
      try {
        const cronExpr = getCronExpression(schedule)
        const interval = (parser as any).parseExpression(cronExpr)
        nextRun = interval.next().toISOString()
      } catch (error) {
        console.error("Error calculating next run:", error)
      }
    }

    const scheduleRecord = {
      id: `schedule-${nanoid()}`,
      name,
      projectId,
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
      schedule,
      cloudStorage: cloudStorage || undefined,
      enabled: enabled !== false,
      nextRun,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    schedules.push(scheduleRecord)

    return NextResponse.json(scheduleRecord, { status: 201 })
  } catch (error) {
    console.error("Error creating schedule:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    let filtered = schedules
    if (projectId) {
      filtered = schedules.filter((s) => s.projectId === projectId)
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error("Error fetching schedules:", error)
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

