import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

interface LoginRequest {
  email: string
  password: string
}

// Map backend roles to frontend role model
const ROLE_MAP: Record<string, string> = {
  CUSTOMER: "TRADER",
  VENDOR: "MANUFACTURER",
  ADMIN: "ADMIN",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      )
    }

    // Proxy the request to the backend API
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })

    const data = await backendResponse.json()

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          message: data.message || "Login failed",
          // SEC-02: preserve the backend error code (e.g. EMAIL_NOT_VERIFIED)
          // so the UI can branch on it instead of guessing from the message.
          error: typeof data.error === "string" ? data.error : undefined,
        },
        { status: backendResponse.status }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: data.data.user.id,
          email: data.data.user.email,
          name: `${data.data.user.firstName || ''} ${data.data.user.lastName || ''}`.trim(),
          role: ROLE_MAP[data.data.user.role] || data.data.user.role || "TRADER",
          phone: data.data.user.phone || undefined,
        },
        token: data.data.tokens.accessToken,
        tokens: data.data.tokens,
      },
      {
        headers: {
          "Set-Cookie": `pp_access_token=${data.data.tokens.accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`,
        },
      }
    )
  } catch (error) {
    console.error("Error logging in:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
