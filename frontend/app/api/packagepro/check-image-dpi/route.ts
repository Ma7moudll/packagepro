import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // TODO: Use Sharp to extract actual DPI from image metadata
    // const sharp = require('sharp')
    // const metadata = await sharp(buffer).metadata()
    // const dpi = metadata.density || metadata.resolution || null

    // For now, return null (unknown DPI)
    return NextResponse.json({ dpi: null })
  } catch (error) {
    console.error("Error checking image DPI:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

