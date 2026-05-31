import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"

// Mock database
const userProfiles: any[] = []

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // TODO: Fetch from database
    // const profile = await prisma.user.findUnique({
    //   where: { id: (session.user as any).id },
    // })

    // Mock profile
    let profile = userProfiles.find((p) => p.id === (session.user as any).id)

    if (!profile) {
      profile = {
        id: (session.user as any).id,
        name: session.user.name || "",
        email: session.user.email || "",
        phone: "",
        company: "",
        address: "",
        preferences: {
          language: "ar",
          theme: "light",
          notifications: true,
        },
      }
      userProfiles.push(profile)
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // TODO: Update in database
    // const profile = await prisma.user.update({
    //   where: { id: (session.user as any).id },
    //   data: body,
    // })

    // Mock update
    const index = userProfiles.findIndex((p) => p.id === (session.user as any).id)
    if (index !== -1) {
      userProfiles[index] = { ...userProfiles[index], ...body, updatedAt: new Date().toISOString() }
    } else {
      userProfiles.push({
        id: (session.user as any).id,
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

