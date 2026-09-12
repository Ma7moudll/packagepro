import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const integrations: any[] = []

export async function GET(
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

    if (!integration || !["hubspot", "salesforce", "zoho"].includes(integration.provider)) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // In production, call CRM API
    // const deals = await crmClient.getDeals(integration.credentials)

    // Mock deals
    const deals = [
      {
        id: "deal-1",
        properties: {
          dealname: "Custom Packaging Order",
          amount: "5000",
          dealstage: "qualifiedtobuy",
          pipeline: "default",
          closedate: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    return NextResponse.json(deals)
  } catch (error) {
    console.error("Error fetching CRM deals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    if (!integration || !["hubspot", "salesforce", "zoho"].includes(integration.provider)) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const deal = await request.json()

    // In production, create deal via CRM API
    // const created = await crmClient.createDeal(integration.credentials, deal)

    const created = {
      ...deal,
      id: `deal-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating CRM deal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

