import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const integrations: any[] = []

export async function POST(
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

    const campaign = await request.json()

    // In production, create campaign via Mailchimp API
    // const created = await mailchimpClient.createCampaign(integration.credentials, campaign)

    const created = {
      ...campaign,
      id: `campaign-${Date.now()}`,
      status: "save",
      createTime: new Date().toISOString(),
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating Mailchimp campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

