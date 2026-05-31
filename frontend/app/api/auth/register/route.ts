import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { EmailService } from "@/lib/email"
import { RegisterSchema } from "@/lib/validation"
import { withValidation, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"
interface RegisterRequest {
  name: string
  email: string
  password: string
  role: string
  company?: string
  phone?: string
}
export const POST = withRateLimit(
  5,
  300000, // 5 requests per 5 minutes
)(
  withValidation(
    RegisterSchema,
    withErrorHandling(async (request: NextRequest, data: RegisterRequest) => {
      MonitoringService.addBreadcrumb("User registration attempt", "auth", {
        email: data.email,
        role: data.role,
      })

      try {
        // Map data to AuthService format
        const registerData = {
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role as "TRADER" | "MANUFACTURER",
          companyName: data.company,
          phone: data.phone,
        }

        const result = await AuthService.register(registerData)

        // Send welcome email (skip if email service fails)
        try {
          await EmailService.sendWelcomeEmail({
            email: data.email,
            name: data.name,
            role: data.role,
          })
        } catch (emailError) {
          console.warn("Failed to send welcome email:", emailError)
        }

        MonitoringService.captureMessage(`New user registered: ${data.email}`, "info")

        return NextResponse.json(
          {
            success: true,
            message: "Registration successful",
            user: {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: result.user.role,
              company: result.user.companyName || undefined,
              phone: result.user.phone || undefined,
            },
            token: result.token,
          },
          { status: 201 },
        )
      } catch (error) {
        MonitoringService.captureException(error as Error, {
          email: data.email,
          role: data.role,
        })

        return NextResponse.json({ error: (error as Error).message }, { status: 400 })
      }
    }),
  ),
)
