import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import bcrypt from "bcryptjs"

// Mock database
const users: any[] = []

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Current password and new password are required" },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "New password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // TODO: Fetch user from database
    // const user = await prisma.user.findUnique({
    //   where: { id: (session.user as any).id },
    // })

    // Mock user
    const user = users.find((u) => u.id === (session.user as any).id)

    if (!user || !user.password) {
      return NextResponse.json(
        { message: "User not found or password not set" },
        { status: 404 }
      )
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // TODO: Update in database
    // await prisma.user.update({
    //   where: { id: (session.user as any).id },
    //   data: { password: hashedPassword },
    // })

    // Mock update
    user.password = hashedPassword
    user.updatedAt = new Date().toISOString()

    return NextResponse.json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

