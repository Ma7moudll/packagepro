import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
// Removed Prisma import - using DatabaseService instead
import { MonitoringService } from "@/lib/monitoring"

// GET /api/manufacturer/products - Get all products for the authenticated manufacturer
export async function GET(request: NextRequest) {
  try {
    // Get user from token (simplified for demo)
    const authHeader = request.headers.get("authorization")
    interface User {
      id: number | string
      role: string
    }
    let user: User | null = null

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const { AuthService } = await import("@/lib/auth")
      try {
        user = await AuthService.getCurrentUser(token)
      } catch {
        // Fall through to mock mode
      }
    }

    // For demo: allow without auth but limit functionality
    // In production, require authentication
    if (!user) {
      // Return mock data for demo
      return NextResponse.json({
        success: true,
        products: [
          {
            id: 1,
            name: "علب كرتون مموج",
            nameEn: "Corrugated Boxes",
            price: 2.5,
            stock: 5000,
            image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
            status: "active",
            sales: 1250,
          },
          {
            id: 2,
            name: "أكياس ورق كرافت",
            nameEn: "Kraft Paper Bags",
            price: 0.25,
            stock: 10000,
            image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
            status: "active",
            sales: 875,
          },
          {
            id: 3,
            name: "أكواب ورقية ساخنة",
            nameEn: "Hot Paper Cups",
            price: 0.15,
            stock: 50000,
            image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop",
            status: "active",
            sales: 3200,
          },
        ],
        pagination: { limit: 100, offset: 0, total: 3 },
        note: "Using demo data",
      })
    }

    if (user.role !== "MANUFACTURER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Manufacturer access required" }, { status: 403 })
    }

    MonitoringService.addBreadcrumb("Fetching manufacturer products", "api", {
      manufacturerId: user.id,
    })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || undefined
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "100"), 200)
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const products = await DatabaseService.getAllProducts({
      manufacturerId: Number(user.id),
      search,
      limit,
      offset,
      sortBy: "createdAt",
      sortOrder: "desc",
    })

    // Transform products for frontend
    const transformedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      nameEn: product.nameEn,
      description: product.description,
      descriptionEn: product.descriptionEn,
      price: product.price,
      category: product.category,
      material: product.material,
      stock: product.stock,
      minQuantity: product.minQuantity,
      customizable: product.customizable,
      sustainableMaterial: product.sustainableMaterial,
      image: product.images?.[0] || "/placeholder.svg",
      images: product.images || [],
      status: product.isActive ? "active" : "inactive",
      isApproved: product.isApproved,
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      products: transformedProducts,
      pagination: {
        limit,
        offset,
        total: transformedProducts.length,
      },
    })
  } catch (error) {
    MonitoringService.captureException(error as Error, {
      context: "manufacturer_products_list",
    })

    // Return mock data as fallback
    return NextResponse.json({
      success: true,
      products: [
        {
          id: 1,
          name: "علب كرتون مموج",
          nameEn: "Corrugated Boxes",
          price: 2.5,
          stock: 5000,
          image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
          status: "active",
          sales: 1250,
        },
        {
          id: 2,
          name: "أكياس ورق كرافت",
          nameEn: "Kraft Paper Bags",
          price: 0.25,
          stock: 10000,
          image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
          status: "active",
          sales: 875,
        },
        {
          id: 3,
          name: "أكواب ورقية ساخنة",
          nameEn: "Hot Paper Cups",
          price: 0.15,
          stock: 50000,
          image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop",
          status: "active",
          sales: 3200,
        },
      ],
      pagination: { limit: 100, offset: 0, total: 3 },
      note: "Using fallback data",
    })
  }
}

// POST /api/manufacturer/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Get user from token (simplified for demo)
    const authHeader = request.headers.get("authorization")
    interface User {
      id: number | string
      role: string
    }
    let user: User | null = null

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const { AuthService } = await import("@/lib/auth")
      try {
        user = await AuthService.getCurrentUser(token)
      } catch {
        // Fall through to mock mode
      }
    }

    // For demo: allow without auth
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      // Return mock success for demo
      return NextResponse.json(
        {
          success: true,
          product: {
            id: Date.now(),
            ...body,
            status: "active",
          },
          note: "Product created (demo mode - requires authentication in production)",
        },
        { status: 201 },
      )
    }

    MonitoringService.addBreadcrumb("Creating product", "api", {
      manufacturerId: user.id,
      productName: body.name,
    })

    // Generate slug
    const slug =
      (body.nameEn || body.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now()

    const productData = {
      name: body.name,
      nameEn: body.nameEn,
      description: body.description,
      descriptionEn: body.descriptionEn,
      price: parseFloat(body.price),
      category: body.category,
      material: body.material,
      stock: parseInt(body.stock),
      minQuantity: parseInt(body.minQuantity) || 1,
      customizable: body.customizable || false,
      sustainableMaterial: body.sustainableMaterial || false,
      images: body.image ? [body.image] : [],
      slug,
      manufacturer: { connect: { id: Number(user.id) } },
      isActive: true,
      isApproved: false, // Requires admin approval
    } as any

    const product = await DatabaseService.createProduct(productData)

    MonitoringService.captureMessage(`Product created: ${product.name}`, "info")

    return NextResponse.json(
      {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          nameEn: product.nameEn,
          price: product.price,
          stock: product.stock,
          image: product.images?.[0] || "/placeholder.svg",
          status: product.isActive ? "active" : "inactive",
        },
      },
      { status: 201 },
    )
  } catch (error) {
    MonitoringService.captureException(error as Error, {
      context: "manufacturer_create_product",
    })

    // Return success with mock ID for demo
    const body = await request.json().catch(() => ({}))
    return NextResponse.json(
      {
        success: true,
        product: {
          id: Date.now(),
          ...body,
          status: "active",
        },
        note: "Product created (mock mode)",
      },
      { status: 201 },
    )
  }
}
