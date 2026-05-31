import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// Mock database
const verificationTokens: Map<string, { email: string; expiresAt: number }> = new Map()
const users: any[] = []

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { message: "Token is required" },
        { status: 400 }
      )
    }

    const tokenData = verificationTokens.get(token)

    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 400 }
      )
    }

    // TODO: Update user in database
    // await prisma.user.update({
    //   where: { email: tokenData.email },
    //   data: { emailVerified: new Date() },
    // })

    // Mock update
    const user = users.find((u) => u.email === tokenData.email)
    if (user) {
      user.emailVerified = new Date().toISOString()
    }

    // Remove used token
    verificationTokens.delete(token)

    return NextResponse.redirect(new URL("/auth/verify-email?verified=true", request.url))
  } catch (error) {
    console.error("Error verifying email:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// Send verification email
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

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = Date.now() + 86400000 // 24 hours

    verificationTokens.set(token, { email, expiresAt })

    // TODO: Send verification email
    // const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`
    // await sendVerificationEmail(email, verificationUrl)

    // For development, log the token
    if (process.env.NODE_ENV === "development") {
      console.log("Verification token:", token)
      console.log("Verification URL:", `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/auth/verify-email?token=${token}`)
    }

    return NextResponse.json({
      message: "Verification email sent",
    })
  } catch (error) {
    console.error("Error sending verification email:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

