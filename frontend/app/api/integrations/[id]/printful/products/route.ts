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

    if (!integration || !["printful", "gooten"].includes(integration.provider)) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // In production, call Printful/Gooten API
    // const products = await printfulClient.getProducts(integration.credentials)

    // Mock products
    const products = [
      {
        id: 1,
        name: "Custom Box",
        type: "box",
        image: "https://example.com/box.jpg",
        variantCount: 3,
        currency: "USD",
      },
    ]

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching Printful products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

