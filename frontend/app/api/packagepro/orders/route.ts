/**
 * PackagePro Orders API
 * Note: This should proxy to backend API
 */

import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/packagepro/orders
 * List orders
 */
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Proxy to backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const queryString = searchParams.toString()
    const response = await fetch(`${backendUrl}/api/orders${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization')! } : {}),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      orders: data.orders || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list orders" },
      { status: 500 },
    )
  }
}
