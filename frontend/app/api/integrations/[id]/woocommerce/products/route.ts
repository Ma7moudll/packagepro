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

    if (!integration || integration.provider !== "woocommerce") {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    // In production, call WooCommerce API
    // const products = await woocommerceClient.getProducts(integration.credentials)

    // Mock products
    const products = [
      {
        id: 1,
        name: "Custom Box",
        slug: "custom-box",
        permalink: "https://example.com/product/custom-box",
        price: "29.99",
        stockStatus: "instock",
        images: [],
        categories: [],
        tags: [],
        status: "publish",
      },
    ]

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching WooCommerce products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    if (!integration || integration.provider !== "woocommerce") {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    const product = await request.json()

    // In production, create product via WooCommerce API
    // const created = await woocommerceClient.createProduct(integration.credentials, product)

    const created = {
      ...product,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Error creating WooCommerce product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

