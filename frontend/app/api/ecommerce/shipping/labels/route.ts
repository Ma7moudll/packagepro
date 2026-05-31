import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const shippingLabels: any[] = []
const orders: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, shippingRateId } = body

    if (!orderId || !shippingRateId) {
      return NextResponse.json(
        { error: "Order ID and shipping rate ID are required" },
        { status: 400 }
      )
    }

    const order = orders.find((o) => o.id === orderId)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // TODO: Create shipping label via API (Aramex, DHL, etc.)
    // const label = await createShippingLabelViaAPI(order, shippingRateId)

    // Mock shipping label
    const trackingNumber = `TRK${Date.now()}${nanoid(8).toUpperCase()}`

    const shippingLabel = {
      id: `label-${nanoid()}`,
      orderId,
      trackingNumber,
      carrier: "Aramex",
      labelUrl: `https://example.com/labels/${trackingNumber}.pdf`,
      trackingUrl: `https://example.com/track/${trackingNumber}`,
      createdAt: new Date().toISOString(),
    }

    shippingLabels.push(shippingLabel)

    // Update order with tracking number
    order.trackingNumber = trackingNumber
    order.orderStatus = "shipped"
    order.updatedAt = new Date().toISOString()

    return NextResponse.json(shippingLabel, { status: 201 })
  } catch (error) {
    console.error("Error creating shipping label:", error)
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
    const orderId = searchParams.get("orderId")

    if (orderId) {
      const label = shippingLabels.find((l) => l.orderId === orderId)
      if (!label) {
        return NextResponse.json({ error: "Label not found" }, { status: 404 })
      }
      return NextResponse.json(label)
    }

    // Return all labels for user's orders
    const userOrders = orders.filter((o) => o.userId === (session.user as any).id)
    const userLabels = shippingLabels.filter((l) =>
      userOrders.some((o) => o.id === l.orderId)
    )

    return NextResponse.json(userLabels)
  } catch (error) {
    console.error("Error fetching shipping labels:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

