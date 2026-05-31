import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const integrations: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integration = integrations.find((i) => i.id === params.id)

    if (!integration || integration.provider !== "mailchimp") {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // In production, call Mailchimp API
    // const lists = await mailchimpClient.getLists(integration.credentials)

    // Mock lists
    const lists = [
      {
        id: "list-1",
        name: "Newsletter Subscribers",
        memberCount: 1250,
        unsubscribeCount: 50,
        createdAt: new Date().toISOString(),
      },
    ]

    return NextResponse.json(lists)
  } catch (error) {
    console.error("Error fetching Mailchimp lists:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

