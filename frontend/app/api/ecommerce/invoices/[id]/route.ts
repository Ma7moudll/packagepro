import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth/server-session"
import { nanoid } from "nanoid"

// Mock database
const invoices: any[] = []
const orders: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invoice = invoices.find((i) => i.id === id)

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Check if user owns the invoice
    const order = orders.find((o) => o.id === invoice.orderId)
    if (!order || order.userId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Generate invoice for order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const order = orders.find((o) => o.id === id)

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if invoice already exists
    let invoice = invoices.find((i) => i.orderId === order.id)

    if (!invoice) {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${nanoid(6).toUpperCase()}`

      invoice = {
        id: `invoice-${nanoid()}`,
        orderId: order.id,
        invoiceNumber,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        items: order.items.map((item: any) => ({
          description: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        currency: order.currency,
        status: "sent",
        createdAt: new Date().toISOString(),
      }

      invoices.push(invoice)

      // Update order with invoice ID
      order.invoiceId = invoice.id
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error generating invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

