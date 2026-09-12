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
    // const contacts = await crmClient.getContacts(integration.credentials)

    // Mock contacts
    const contacts = [
      {
        id: "contact-1",
        properties: {
          email: "customer@example.com",
          firstname: "John",
          lastname: "Doe",
          phone: "+1234567890",
          company: "Example Corp",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    return NextResponse.json(contacts)
  } catch (error) {
    console.error("Error fetching CRM contacts:", error)
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

    const contact = await request.json()

    // In production, create contact via CRM API
    // const created = await crmClient.createContact(integration.credentials, contact)

    const created = {
      ...contact,
      id: `contact-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating CRM contact:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

