import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"

// Mock database and tokens
const users: any[] = []
const resetTokens: Map<string, { email: string; expiresAt: number }> = new Map()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Verify token
    const tokenData = resetTokens.get(token)

    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 400 }
      )
    }

    // Find user
    const user = users.find((u) => u.email === tokenData.email)
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password
    user.password = hashedPassword
    user.updatedAt = new Date().toISOString()

    // Remove used token
    resetTokens.delete(token)

    return NextResponse.json({
      message: "Password has been reset successfully",
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

