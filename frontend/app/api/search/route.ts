import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { SearchSchema } from "@/lib/validation"
import { withValidation, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"

interface SearchRequest {
  query?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  rating?: number
  [key: string]: any
}

// GET /api/search - Advanced product search
export const GET = withValidation(
  SearchSchema.omit({ query: true }).extend({ query: SearchSchema.shape.query.optional() }),
  withRateLimit(
    200,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, data: SearchRequest) => {
      const { searchParams } = new URL(request.url)
      const query = searchParams.get("query") || ""

      const searchOptions = {
        ...data,
        search: query,
      }

      MonitoringService.addBreadcrumb("Performing product search", "api", searchOptions)

      // Log search query
      if (query) {
        await DatabaseService.logSearchQuery(query, undefined, 0)
      }

      const products = await DatabaseService.getAllProducts(searchOptions)

      // Update search results count
      if (query) {
        await DatabaseService.logSearchQuery(query, undefined, products.length)
      }

      return NextResponse.json({
        products,
        query,
        resultsCount: products.length,
        pagination: {
          limit: data.limit,
          offset: data.offset,
          total: products.length,
        },
      })
    }),
  ),
)

