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

    if (!integration || integration.provider !== "etsy") {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // In production, call Etsy API
    // const listings = await etsyClient.getListings(integration.credentials)

    // Mock listings
    const listings = [
      {
        listingId: 123456,
        title: "Custom Packaging Box",
        price: 29.99,
        currencyCode: "USD",
        quantity: 10,
        images: [],
        state: "active",
        shopId: 789,
      },
    ]

    return NextResponse.json(listings)
  } catch (error) {
    console.error("Error fetching Etsy listings:", error)
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

    if (!integration || integration.provider !== "etsy") {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const listing = await request.json()

    // In production, create listing via Etsy API
    // const created = await etsyClient.createListing(integration.credentials, listing)

    const created = {
      ...listing,
      listingId: Date.now(),
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating Etsy listing:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

