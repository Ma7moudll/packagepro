import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const integrations: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { provider, credentials, settings } = body

    // Validate credentials based on provider
    // In production, test the connection here

    const integration = {
      id: `integration-${nanoid()}`,
      name: getProviderName(provider),
      type: getProviderType(provider),
      provider,
      status: "connected",
      credentials: {
        // Store encrypted credentials in production
        ...credentials,
      },
      settings: settings || {
        autoSync: false,
        syncInterval: 60,
        syncProducts: true,
        syncOrders: false,
        syncInventory: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    integrations.push(integration)

    return NextResponse.json(integration, { status: 201 })
  } catch (error) {
    console.error("Error connecting integration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getProviderName(provider: string): string {
  const names: Record<string, string> = {
    shopify: "Shopify",
    woocommerce: "WooCommerce",
    etsy: "Etsy",
    printful: "Printful",
    gooten: "Gooten",
    mailchimp: "Mailchimp",
    hubspot: "HubSpot",
    salesforce: "Salesforce",
    zoho: "Zoho",
    "google-drive": "Google Drive",
    dropbox: "Dropbox",
  }
  return names[provider] || provider
}

function getProviderType(provider: string): string {
  if (["shopify", "woocommerce", "etsy"].includes(provider)) return "ecommerce"
  if (["printful", "gooten"].includes(provider)) return "print-on-demand"
  if (["mailchimp", "hubspot"].includes(provider)) return "marketing"
  if (["salesforce", "zoho"].includes(provider)) return "crm"
  if (["google-drive", "dropbox"].includes(provider)) return "storage"
  return "other"
}

