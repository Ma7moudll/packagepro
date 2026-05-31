import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { ReviewSchema } from "@/lib/validation"
import { withAuth, withValidation, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"

interface User {
  id: number | string
  role: string
}

interface ReviewRequest {
  productId: number
  rating: number
  comment?: string
  images?: string[]
}

// POST /api/reviews - Create product review
export const POST = withAuth(
  withValidation(
    ReviewSchema,
    withRateLimit(
      10,
      60000,
    )(
      withErrorHandling(async (request: NextRequest, data: ReviewRequest, user: User) => {
        MonitoringService.addBreadcrumb("Creating review", "api", {
          userId: user.id,
          productId: data.productId,
          rating: data.rating,
        })

        // Check if user has already reviewed this product
        const reviews = await DatabaseService.getProductReviews(data.productId)
        const existingReview = reviews.find((r: { userId: number | string }) => r.userId === user.id)
        if (existingReview) {
          return NextResponse.json({ error: "You have already reviewed this product" }, { status: 400 })
        }

        // Verify product exists
        const product = await DatabaseService.getProductById(data.productId)
        if (!product) {
          return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        const review = await DatabaseService.createReview({
          userId: Number(user.id),
          productId: data.productId,
          rating: data.rating,
          comment: data.comment,
          images: data.images || [],
        })

        MonitoringService.captureMessage(`Review created for product: ${data.productId}`, "info")

        return NextResponse.json(review, { status: 201 })
      }),
    ),
  ),
)

// GET /api/reviews - Get product reviews
export const GET = withRateLimit(
  200,
  60000,
)(
  withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    MonitoringService.addBreadcrumb("Fetching product reviews", "api", {
      productId: Number.parseInt(productId),
    })

    const reviews = await DatabaseService.getProductReviews(Number.parseInt(productId))

    return NextResponse.json({ reviews })
  }),
)
