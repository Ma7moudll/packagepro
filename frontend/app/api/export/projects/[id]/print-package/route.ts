import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/session"
import { nanoid } from "nanoid"

// Mock database
const printPackages: any[] = []
const projects: any[] = []

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const project = projects.find((p) => p.id === id)

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const body = await request.json()
    const { settings, contactName, contactEmail, contactPhone, instructions } = body

    // Generate print-ready package files
    const files = [
      {
        id: `file-${nanoid()}`,
        name: `${project.name}-artwork.pdf`,
        type: "artwork",
        url: `https://example.com/print-packages/${nanoid()}/artwork.pdf`,
        format: "pdf",
        size: 2048000,
      },
      {
        id: `file-${nanoid()}`,
        name: `${project.name}-die-cut.pdf`,
        type: "die-cut",
        url: `https://example.com/print-packages/${nanoid()}/die-cut.pdf`,
        format: "pdf",
        size: 512000,
      },
      {
        id: `file-${nanoid()}`,
        name: `${project.name}-fold-lines.pdf`,
        type: "fold-lines",
        url: `https://example.com/print-packages/${nanoid()}/fold-lines.pdf`,
        format: "pdf",
        size: 256000,
      },
      {
        id: `file-${nanoid()}`,
        name: `instructions.txt`,
        type: "instructions",
        url: `https://example.com/print-packages/${nanoid()}/instructions.txt`,
        format: "txt",
        size: 1024,
      },
      {
        id: `file-${nanoid()}`,
        name: `color-specs.pdf`,
        type: "color-specs",
        url: `https://example.com/print-packages/${nanoid()}/color-specs.pdf`,
        format: "pdf",
        size: 128000,
      },
    ]

    const printPackage = {
      id: `package-${nanoid()}`,
      projectId: id,
      name: `${project.name}-print-package`,
      files,
      metadata: {
        dimensions: project.dimensions || {
          width: 200,
          height: 150,
          depth: 100,
          unit: "mm",
        },
        material: project.material || "cardboard",
        colors: {
          front: 4,
          back: 4,
          sides: 0,
        },
        specialEffects: [],
        instructions: instructions || "",
        contactInfo: {
          name: contactName || "",
          email: contactEmail || "",
          phone: contactPhone || "",
        },
      },
      createdAt: new Date().toISOString(),
    }

    printPackages.push(printPackage)

    return NextResponse.json(printPackage, { status: 201 })
  } catch (error) {
    console.error("Error generating print package:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

