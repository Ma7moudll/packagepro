import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth/server-session"

// Mock database
const orders: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const order = orders.find((o) => o.id === id)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if user owns the order
    if (order.userId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const order = orders.find((o) => o.id === id)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Only owner or admin can update
    if (order.userId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const updates = {
      ...body,
      updatedAt: new Date().toISOString(),
    }

    Object.assign(order, updates)

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

