import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

// Proxy email verification to the real backend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { message: "Token is required" },
        { status: 400 }
      )
    }

    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })

    const data = await backendResponse.json()

    if (!backendResponse.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Verification failed" },
        { status: backendResponse.status }
      )
    }

    return NextResponse.json({ success: true, message: "Email verified" })
  } catch (error) {
    console.error("Error verifying email:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}