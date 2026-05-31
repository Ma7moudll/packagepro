import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { MessageSchema } from "@/lib/validation"
import { withAuth, withValidation, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"
interface User {
  id: number | string
  role: string
}

interface MessageRequest {
  receiverId: number
  subject?: string
  content: string
  attachments?: string[]
}
// POST /api/messages - Send message
export const POST = withAuth(
  withValidation(
    MessageSchema,
    withRateLimit(
      50,
      60000,
    )(
      withErrorHandling(async (request: NextRequest, data: MessageRequest, user: User) => {
        MonitoringService.addBreadcrumb("Sending message", "api", {
          senderId: user.id,
          receiverId: data.receiverId,
        })

        // Verify receiver exists
        const receiver = await DatabaseService.getUserById(data.receiverId)
        if (!receiver) {
          return NextResponse.json({ error: "Receiver not found" }, { status: 404 })
        }

        const message = await DatabaseService.sendMessage({
          senderId: Number(user.id),
          receiverId: data.receiverId,
          subject: data.subject,
          content: data.content,
          attachments: data.attachments || [],
        })

        MonitoringService.captureMessage(`Message sent from ${user.id} to ${data.receiverId}`, "info")

        return NextResponse.json(message, { status: 201 })
      }),
    ),
  ),
)

// GET /api/messages - Get conversation
export const GET = withAuth(
  withRateLimit(
    100,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User) => {
      const { searchParams } = new URL(request.url)
      const otherUserId = searchParams.get("userId")

      if (!otherUserId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 })
      }

      MonitoringService.addBreadcrumb("Fetching conversation", "api", {
        userId: user.id,
        otherUserId: Number.parseInt(otherUserId),
      })

      const messages = await DatabaseService.getConversation(Number(user.id), Number.parseInt(otherUserId))

      return NextResponse.json({ messages })
    }),
  ),
)
