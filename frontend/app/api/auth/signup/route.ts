import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      )
    }

    const backendRole = role === "MANUFACTURER" || role === "VENDOR" ? "VENDOR" : "CUSTOMER"

    // Proxy the request to the backend API
    const backendResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name: name || '',
        role: backendRole,
      }),
    })

    const data = await backendResponse.json()

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: data.message || "Registration failed" },
        { status: backendResponse.status }
      )
    }

    const userData = data.data
    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: {
          id: userData.userId || userData.id,
          email: userData.email,
          name: name || userData.email.split('@')[0],
          role: backendRole === "VENDOR" ? "MANUFACTURER" : "TRADER",
        },
        tokens: userData.tokens,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

