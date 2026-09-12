import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const integrations: any[] = []

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

    if (!integration || !["printful", "gooten"].includes(integration.provider)) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const order = await request.json()

    // In production, create order via Printful/Gooten API
    // const created = await printfulClient.createOrder(integration.credentials, order)

    const created = {
      ...order,
      id: Date.now(),
      status: "pending",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating Printful order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

