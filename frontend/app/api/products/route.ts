import { type NextRequest, NextResponse } from "next/server"

// Mock products as fallback with real images from Unsplash
const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "علب كرتون مموج",
    nameEn: "Corrugated Boxes",
    description: "علب كرتون مموج عالية الجودة مناسبة للشحن والتخزين",
    descriptionEn: "High-quality corrugated boxes suitable for shipping and storage",
    price: 2.5,
    image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1604069295768-7f9e8019f14c?w=800&h=600&fit=crop",
    ],
    category: "food-packaging",
    subcategory: "boxes",
    material: "Corrugated Cardboard",
    minQuantity: 100,
    customizable: true,
    stock: 5000,
    sizes: ["Small", "Medium", "Large"],
    rating: 4.5,
    reviewCount: 28,
    discount: 0,
    featured: true,
    sustainableMaterial: false,
  },
  {
    id: "2",
    name: "أكواب ورقية ساخنة",
    nameEn: "Hot Paper Cups",
    description: "أكواب ورقية معزولة للمشروبات الساخنة",
    descriptionEn: "Insulated paper cups for hot beverages",
    price: 0.15,
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&h=600&fit=crop",
    ],
    category: "cups-lids",
    subcategory: "cups",
    material: "Insulated Paper",
    minQuantity: 1000,
    customizable: true,
    stock: 50000,
    sizes: ["8oz", "12oz", "16oz"],
    rating: 4.7,
    reviewCount: 45,
    discount: 10,
    featured: true,
    sustainableMaterial: true,
  },
  {
    id: "3",
    name: "أكياس ورق كرافت",
    nameEn: "Kraft Paper Bags",
    description: "أكياس ورق كرافت صديقة للبيئة",
    descriptionEn: "Eco-friendly kraft paper bags",
    price: 0.25,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=600&fit=crop",
    ],
    category: "bags-packaging",
    subcategory: "bags",
    material: "Kraft Paper",
    minQuantity: 500,
    customizable: true,
    stock: 10000,
    sizes: ["Small", "Medium", "Large"],
    rating: 4.6,
    reviewCount: 32,
    discount: 0,
    featured: false,
    sustainableMaterial: true,
  },
  {
    id: "4",
    name: "علب بيتزا",
    nameEn: "Pizza Boxes",
    description: "علب بيتزا كرتون غذائي عالي الجودة",
    descriptionEn: "High-quality food grade cardboard pizza boxes",
    price: 1.5,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=600&fit=crop",
    ],
    category: "food-packaging",
    subcategory: "boxes",
    material: "Food Grade Cardboard",
    minQuantity: 200,
    customizable: true,
    stock: 8000,
    sizes: ["10 inch", "12 inch", "14 inch"],
    rating: 4.8,
    reviewCount: 56,
    discount: 5,
    featured: true,
    sustainableMaterial: false,
  },
  {
    id: "5",
    name: "حاويات بلاستيك غذائية",
    nameEn: "Food Plastic Containers",
    description: "حاويات بلاستيك آمنة للطعام مع أغطية",
    descriptionEn: "Food-safe plastic containers with lids",
    price: 0.5,
    image: "https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&h=600&fit=crop",
    ],
    category: "food-packaging",
    subcategory: "containers",
    material: "Food Grade Plastic",
    minQuantity: 500,
    customizable: false,
    stock: 15000,
    sizes: ["250ml", "500ml", "1000ml"],
    rating: 4.4,
    reviewCount: 38,
    discount: 0,
    featured: false,
    sustainableMaterial: false,
  },
  {
    id: "6",
    name: "أكواب باردة بلاستيك",
    nameEn: "Cold Plastic Cups",
    description: "أكواب بلاستيك شفافة للمشروبات الباردة",
    descriptionEn: "Clear plastic cups for cold beverages",
    price: 0.08,
    image: "https://images.unsplash.com/photo-1592564630984-7410f94db184?w=800&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1592564630984-7410f94db184?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop",
    ],
    category: "cups-lids",
    subcategory: "cups",
    material: "Food Grade Plastic",
    minQuantity: 2000,
    customizable: false,
    stock: 100000,
    sizes: ["12oz", "16oz", "20oz"],
    rating: 4.3,
    reviewCount: 67,
    discount: 15,
    featured: false,
    sustainableMaterial: false,
  },
  {
    id: "7",
    name: "أدوات مائدة خشبية",
    nameEn: "Wooden Cutlery",
    description: "أدوات مائدة خشبية صديقة للبيئة",
    descriptionEn: "Eco-friendly wooden cutlery",
    price: 0.05,
    image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=600&fit=crop",
    ],
    category: "cutlery",
    subcategory: "utensils",
    material: "Wood",
    minQuantity: 5000,
    customizable: false,
    stock: 50000,
    sizes: ["Standard"],
    rating: 4.6,
    reviewCount: 42,
    discount: 0,
    featured: false,
    sustainableMaterial: true,
  },
  {
    id: "8",
    name: "أكياس توصيل حرارية",
    nameEn: "Thermal Delivery Bags",
    description: "أكياس توصيل معزولة حرارياً",
    descriptionEn: "Thermally insulated delivery bags",
    price: 12.0,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1571045736765-c9fb1bb22920?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1594736797933-d0c7c6e72dd3?w=800&h=600&fit=crop",
    ],
    category: "delivery-supplies",
    subcategory: "bags",
    material: "Insulated Fabric",
    minQuantity: 10,
    customizable: true,
    stock: 500,
    sizes: ["Small", "Medium", "Large", "XL"],
    rating: 4.9,
    reviewCount: 89,
    discount: 0,
    featured: true,
    sustainableMaterial: false,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20"), 100)
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Apply filters to mock products
    let filtered = [...MOCK_PRODUCTS]

    // Search filter
    const search = searchParams.get("search")
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchLower) ||
          product.nameEn.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.descriptionEn.toLowerCase().includes(searchLower),
      )
    }

    // Category filter
    const category = searchParams.get("category")
    if (category && category !== "all") {
      filtered = filtered.filter((product) => product.category === category)
    }

    // Material filter
    const material = searchParams.get("material")
    if (material && material !== "all") {
      filtered = filtered.filter((product) => product.material === material)
    }

    // Sustainable filter
    const sustainable = searchParams.get("sustainable")
    const feature = searchParams.get("feature")
    if (sustainable === "true" || feature === "sustainable") {
      filtered = filtered.filter((product) => product.sustainableMaterial === true)
    }

    // Price range filter
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    if (minPrice || maxPrice) {
      filtered = filtered.filter((product) => {
        const price = product.price
        if (minPrice && price < Number.parseFloat(minPrice)) return false
        if (maxPrice && price > Number.parseFloat(maxPrice)) return false
        return true
      })
    }

    // Sort
    const sortBy = searchParams.get("sortBy")
    if (sortBy) {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case "price-low":
            return a.price - b.price
          case "price-high":
            return b.price - a.price
          case "rating":
            return (b.rating || 0) - (a.rating || 0)
          case "name":
          default:
            return a.name.localeCompare(b.name)
        }
      })
    }

    // Pagination
    const paginatedProducts = filtered.slice(offset, offset + limit)

    return NextResponse.json(
      {
        success: true,
        products: paginatedProducts,
        pagination: {
          limit,
          offset,
          total: filtered.length,
        },
        filters: {
          categories: [
            { value: "all", label: "جميع الفئات" },
            { value: "food-packaging", label: "تعبئة الأطعمة" },
            { value: "cups-lids", label: "الأكواب والأغطية" },
            { value: "bags-packaging", label: "الأكياس والتغليف" },
            { value: "cutlery", label: "أدوات المائدة" },
            { value: "delivery-supplies", label: "مستلزمات التوصيل" },
          ],
          materials: [
            { value: "all", label: "جميع المواد" },
            { value: "Corrugated Cardboard", label: "كرتون مقوى" },
            { value: "Food Grade Cardboard", label: "كرتون غذائي" },
            { value: "Food Grade Plastic", label: "بلاستيك غذائي" },
            { value: "Kraft Paper", label: "ورق كرافت" },
            { value: "Insulated Paper", label: "ورق معزول" },
          ],
        },
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("❌ Error in GET /api/products:", error)

    return NextResponse.json(
      {
        success: true,
        products: MOCK_PRODUCTS,
        pagination: {
          limit: 20,
          offset: 0,
          total: MOCK_PRODUCTS.length,
        },
        note: "Returning mock data due to server error",
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    return NextResponse.json(
      {
        success: true,
        message: "Product creation will be available after database setup",
        product: {
          id: Date.now().toString(),
          ...body,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating product:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create product",
      },
      { status: 400 },
    )
  }
}
