import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth/server-session"
// import jsPDF from "jspdf"

// Mock database
const invoices: any[] = []

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSessionUser(request)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const invoice = invoices.find((i) => i.id === id)

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // TODO: Generate PDF invoice using jsPDF
    // const doc = new jsPDF()
    // doc.text(`Invoice ${invoice.invoiceNumber}`, 10, 10)
    // // ... add invoice content
    // const pdfBlob = doc.output("blob")

    // For now, return mock PDF
    const mockPdfContent = `Invoice ${invoice.invoiceNumber}\n\nTotal: ${invoice.total} ${invoice.currency}`
    const blob = new Blob([mockPdfContent], { type: "application/pdf" })

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error downloading invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

