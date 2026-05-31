/**
 * PackagePro Quotes API
 * Note: This should proxy to backend API or use mock data
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const createQuoteSchema = z.object({
  productId: z.string(),
  qty: z.number().min(1),
  material: z.string().optional(),
  finish: z.string().optional(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    depth: z.number(),
  }).optional(),
})

/**
 * POST /api/packagepro/quotes
 * Create a quote request
 */
export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const validated = createQuoteSchema.parse(body)

    // Proxy to backend API or return mock response
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${backendUrl}/api/pricing/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productType: validated.productId,
          quantity: validated.qty,
          material: validated.material,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          success: true,
          quote: {
            id: `quote_${Date.now()}`,
            productId: validated.productId,
            qty: validated.qty,
            price: data.totalPrice || 0,
            currency: 'EGP',
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }, { status: 201 })
      }
    } catch (e) {
      // Fallback to mock response
    }

    // Mock response
    return NextResponse.json({
      success: true,
      quote: {
        id: `quote_${Date.now()}`,
        productId: validated.productId,
        qty: validated.qty,
        price: validated.qty * 10,
        currency: 'EGP',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: error.message || "Failed to create quote" },
      { status: 500 },
    )
  }
}

/**
 * GET /api/packagepro/quotes
 * List quotes
 */
export const GET = async (request: NextRequest) => {
  try {
    // Return mock quotes
    return NextResponse.json({
      success: true,
      quotes: [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list quotes" },
      { status: 500 },
    )
  }
}
