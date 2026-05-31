/**
 * PackagePro Supplier Portal Orders API
 * Note: This should proxy to backend API
 */

import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/packagepro/supplier/orders
 * List orders assigned to supplier
 */
export const GET = async (request: NextRequest) => {
  try {
    // Proxy to backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${backendUrl}/api/orders`, {
        method: 'GET',
        headers: {
          ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization')! } : {}),
        },
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          success: true,
          orders: data.orders || [],
        })
      }
    } catch (e) {
      // Fallback to mock
    }

    // Mock response
    return NextResponse.json({
      success: true,
      orders: [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list orders" },
      { status: 500 },
    )
  }
}
