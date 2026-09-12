import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth/server-session"

// Mock collaboration rooms
const rooms: Map<string, any> = new Map()

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get("roomId")

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 })
    }

    // Get room data
    const room = rooms.get(roomId) || {
      id: roomId,
      users: [],
      permission: "view",
    }

    return NextResponse.json(room)
  } catch (error) {
    console.error("Error fetching collaboration room:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { roomId, permission } = body

    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 })
    }

    // Create or update room
    const room = rooms.get(roomId) || {
      id: roomId,
      ownerId: session.id,
      users: [],
      permissions: new Map(),
    }

    if (permission) {
      room.permissions.set(session.id, permission)
    }

    rooms.set(roomId, room)

    return NextResponse.json(room)
  } catch (error) {
    console.error("Error creating collaboration room:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

