/**
 * PackagePro Suppliers API
 * Note: This should proxy to backend API
 */

import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/packagepro/suppliers
 * List suppliers
 */
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    
    // Proxy to backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const queryString = searchParams.toString()
    
    try {
      const response = await fetch(`${backendUrl}/api/vendors${queryString ? `?${queryString}` : ''}`, {
        method: 'GET',
        headers: {
          ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization')! } : {}),
        },
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          success: true,
          suppliers: data.vendors || [],
        })
      }
    } catch (e) {
      // Fallback to mock
    }

    // Mock response
    return NextResponse.json({
      success: true,
      suppliers: [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list suppliers" },
      { status: 500 },
    )
  }
}
