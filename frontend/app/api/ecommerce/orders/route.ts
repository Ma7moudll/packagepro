import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth/server-session"
import { nanoid } from "nanoid"

// Mock database
const orders: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { items, shippingAddress, billingAddress, paymentMethod } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const tax = subtotal * 0.15
    const shipping = subtotal >= 500 ? 0 : 25 + (items.length - 1) * 5
    const total = subtotal + tax + shipping

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${nanoid(6).toUpperCase()}`

    // Create order
    const order = {
      id: `order-${nanoid()}`,
      orderNumber,
      userId: session.id,
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      paymentStatus: paymentMethod.type === "cash_on_delivery" ? "pending" : "paid",
      orderStatus: "pending",
      subtotal,
      tax,
      shipping,
      total,
      currency: "SAR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    orders.push(order)

    // TODO: Process payment
    // if (paymentMethod.type === "stripe") {
    //   await processStripePayment(paymentMethod.stripePaymentMethodId, total)
    // } else if (paymentMethod.type === "paypal") {
    //   await processPayPalPayment(paymentMethod.paypalOrderId)
    // }

    // TODO: Generate invoice
    // const invoice = await generateInvoice(order)

    // TODO: Create shipping label
    // const shippingLabel = await createShippingLabel(order)

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Filter orders by user
    const userOrders = orders.filter((o) => o.userId === session.id)

    return NextResponse.json(userOrders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

