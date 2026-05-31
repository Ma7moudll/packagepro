import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
// import JSZip from "jszip"

// Mock database
const printPackages: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const printPackage = printPackages.find((p) => p.id === params.id)

    if (!printPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 })
    }

    // In production, use JSZip to create ZIP file
    // const zip = new JSZip()
    // for (const file of printPackage.files) {
    //   const fileBlob = await fetch(file.url).then(r => r.blob())
    //   zip.file(file.name, fileBlob)
    // }
    // const zipBlob = await zip.generateAsync({ type: "blob" })

    // For now, return mock ZIP
    const mockZipContent = `ZIP file for print package ${params.id}`
    const blob = new Blob([mockZipContent], { type: "application/zip" })

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${printPackage.name}.zip"`,
      },
    })
  } catch (error) {
    console.error("Error downloading print package:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

