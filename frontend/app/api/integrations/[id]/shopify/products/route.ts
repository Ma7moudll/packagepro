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

    if (!integration || integration.provider !== "shopify") {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // In production, call Shopify API
    // const products = await shopifyClient.getProducts(integration.credentials)

    // Mock products
    const products = [
      {
        id: "product-1",
        title: "Custom Box",
        handle: "custom-box",
        description: "A custom packaging box",
        variants: [
          {
            id: "variant-1",
            title: "Default",
            price: "29.99",
            sku: "BOX-001",
          },
        ],
        images: [],
        status: "active",
      },
    ]

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching Shopify products:", error)
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

    if (!integration || integration.provider !== "shopify") {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const product = await request.json()

    // In production, create product via Shopify API
    // const created = await shopifyClient.createProduct(integration.credentials, product)

    const created = {
      ...product,
      id: `product-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating Shopify product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

