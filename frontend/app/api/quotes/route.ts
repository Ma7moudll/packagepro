import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { EmailService } from "@/lib/email"
import { withAuth, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"

interface User {
  id: number | string
  role: string
  name?: string
  companyName?: string
}

interface Quote {
  id: number
  status: string
  totalAmount?: number
  price?: number
  [key: string]: any
}

// POST /api/quotes - Create a quote for an RFQ (Manufacturer only)
export const POST = withAuth(
  withRateLimit(
    50,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User) => {
      if (user.role !== "MANUFACTURER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized. Manufacturers only." }, { status: 403 })
      }

      try {
        const body = await request.json()
        const { customOrderId, price, quantity, deliveryTime, specifications, validUntil } = body

        // Validate required fields
        if (!customOrderId || !price || !quantity || !deliveryTime || !specifications || !validUntil) {
          return NextResponse.json(
            {
              error: "Missing required fields",
              required: ["customOrderId", "price", "quantity", "deliveryTime", "specifications", "validUntil"],
            },
            { status: 400 },
          )
        }

        MonitoringService.addBreadcrumb("Creating quote", "api", {
          manufacturerId: user.id,
          customOrderId,
          price,
          quantity,
        })

        // Create the quote
        const quote = await DatabaseService.createQuote({
          customOrderId,
          manufacturerId: Number(user.id),
          price: Number.parseFloat(price),
          quantity: Number.parseInt(quantity),
          deliveryTime: Number.parseInt(deliveryTime),
          specifications,
          validUntil: new Date(validUntil),
        })

        // Get custom order details for notification
        const customOrder = await DatabaseService.getCustomOrderById(customOrderId)

        if (customOrder) {
          // Send notification to trader
          await EmailService.sendQuoteNotification({
            customerEmail: customOrder.customerEmail,
            customerName: customOrder.customerName,
            manufacturerName: (user.name || user.companyName || "") as string,
            customOrderNumber: customOrder.requestNumber,
            price: Number(price),
            deliveryTime: Number(deliveryTime),
            specifications,
          })
        }

        MonitoringService.captureMessage(`Quote created by manufacturer ${user.id} for RFQ ${customOrderId}`, "info")

        return NextResponse.json(
          {
            message: "Quote created successfully",
            quote,
          },
          { status: 201 },
        )
      } catch (error) {
        console.error("Error creating quote:", error)
        MonitoringService.captureException(error as Error)

        return NextResponse.json(
          {
            error: "Failed to create quote",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
          },
          { status: 500 },
        )
      }
    }),
  ),
)

// GET /api/quotes - Get quotes for a user
export const GET = withAuth(
  withRateLimit(
    100,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User) => {
      try {
        const { searchParams } = new URL(request.url)
        const customOrderId = searchParams.get("customOrderId")
        const status = searchParams.get("status")

        MonitoringService.addBreadcrumb("Fetching quotes", "api", {
          userId: user.id,
          customOrderId,
          status,
        })

        let quotes: Quote[] = []

        if (user.role === "MANUFACTURER") {
          // Manufacturers see quotes they've created
          quotes = await DatabaseService.getQuotesByManufacturer?.(Number(user.id), {
            customOrderId: customOrderId ?? undefined,
            status: status ?? undefined
          })
        } else if (user.role === "TRADER") {
          // Traders see quotes for their RFQs
          if (customOrderId) {
            quotes = await DatabaseService.getQuotesByCustomOrder?.(customOrderId ?? "")
          } else {
            quotes = await DatabaseService.getQuotesByTrader?.(Number(user.id), { status: status ?? undefined })
          }
        } else if (user.role === "ADMIN") {
          // Admins see all quotes
          quotes = await DatabaseService.getAllQuotes?.({ customOrderId: customOrderId ?? undefined, status: status ?? undefined })
        }

        return NextResponse.json({
          quotes: quotes || [],
          total: quotes?.length || 0,
        })
      } catch (error) {
        console.error("Error fetching quotes:", error)
        MonitoringService.captureException(error as Error)

        return NextResponse.json(
          {
            error: "Failed to fetch quotes",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
            quotes: [],
            total: 0,
          },
          { status: 500 },
        )
      }
    }),
  ),
)

// PATCH /api/quotes/:id - Update quote status (Accept/Reject)
export const PATCH = withAuth(
  withRateLimit(
    50,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User) => {
      try {
        const body = await request.json()
        const { quoteId, status } = body

        if (!quoteId || !status) {
          return NextResponse.json(
            {
              error: "Missing required fields",
              required: ["quoteId", "status"],
            },
            { status: 400 },
          )
        }

        if (!["ACCEPTED", "REJECTED"].includes(status)) {
          return NextResponse.json(
            {
              error: "Invalid status",
              allowed: ["ACCEPTED", "REJECTED"],
            },
            { status: 400 },
          )
        }

        MonitoringService.addBreadcrumb("Updating quote status", "api", {
          userId: user.id,
          quoteId,
          status,
        })

        // Update quote status
        const updatedQuote = await DatabaseService.updateQuoteStatus?.(quoteId, status)

        if (!updatedQuote) {
          return NextResponse.json({ error: "Quote not found" }, { status: 404 })
        }

        // Send notification
        // TODO: Implement sendQuoteAcceptedNotification in EmailService
        // if (status === "ACCEPTED") {
        //   await EmailService.sendQuoteAcceptedNotification?.({
        //     manufacturerEmail: updatedQuote.manufacturer?.email,
        //     manufacturerName: updatedQuote.manufacturer?.name,
        //     traderName: user.name,
        //     productName: updatedQuote.customOrder?.productName,
        //   })
        // }

        MonitoringService.captureMessage(`Quote ${quoteId} ${status.toLowerCase()} by user ${user.id}`, "info")

        return NextResponse.json({
          message: `Quote ${status.toLowerCase()} successfully`,
          quote: updatedQuote,
        })
      } catch (error) {
        console.error("Error updating quote status:", error)
        MonitoringService.captureException(error as Error)

        return NextResponse.json(
          {
            error: "Failed to update quote status",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
          },
          { status: 500 },
        )
      }
    }),
  ),
)
