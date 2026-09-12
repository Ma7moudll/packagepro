import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

// Proxy verification email resend to the real backend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      )
    }

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/auth/resend-verification`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }
    )

    const data = await backendResponse.json()

    if (!backendResponse.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Failed to resend verification" },
        { status: backendResponse.status }
      )
    }

    return NextResponse.json({ success: true, message: "Verification email sent" })
  } catch (error) {
    console.error("Error resending verification:", error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}