import { NextRequest, NextResponse } from "next/server"
// import nodemailer from "nodemailer"
import crypto from "crypto"

// Mock database
const resetTokens: Map<string, { email: string; expiresAt: number }> = new Map()

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

    // TODO: Check if user exists in database
    // const user = await prisma.user.findUnique({ where: { email } })
    // if (!user) {
    //   // Don't reveal if user exists for security
    //   return NextResponse.json({ message: "If the email exists, a reset link has been sent" })
    // }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = Date.now() + 3600000 // 1 hour

    resetTokens.set(token, { email, expiresAt })

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password/${token}`
    // await sendResetEmail(email, resetUrl)

    // For development, log the token
    if (process.env.NODE_ENV === "development") {
      console.log("Reset token:", token)
      console.log("Reset URL:", `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/auth/reset-password/${token}`)
    }

    return NextResponse.json({
      message: "If the email exists, a reset link has been sent",
    })
  } catch (error) {
    console.error("Error sending reset email:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// Verify reset token
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

    const tokenData = resetTokens.get(token)

    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 400 }
      )
    }

    return NextResponse.json({ valid: true, email: tokenData.email })
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

