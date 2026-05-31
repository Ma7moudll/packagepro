import { prisma } from "./prisma"

/**
 * تحقق من اتصال قاعدة البيانات والجداول الأساسية
 */
export async function checkDatabaseConnection() {
  try {
    console.log("🔍 Checking database connection...")

    // اختبار الاتصال
    await prisma.$queryRaw`SELECT 1`
    console.log("✅ Database connection successful")

    // تحقق من الجداول الأساسية
    const tablesCheck = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `

    const requiredTables = [
      "users",
      "products",
      "orders",
      "order_items",
      "custom_orders",
      "quotes",
      "sample_requests",
      "price_alerts",
      "cart_items",
      "wishlist_items",
      "reviews",
      "messages",
      "notifications",
      "payments",
      "loyalty_points",
      "product_views",
      "search_queries",
      "system_config",
    ]

    const existingTables = (tablesCheck as any[]).map((t: any) => t.table_name)
    const missingTables = requiredTables.filter((t) => !existingTables.includes(t))

    if (missingTables.length === 0) {
      console.log(`✅ All required tables exist (${requiredTables.length} tables)`)
      return { success: true, message: "Database is properly configured" }
    } else {
      console.warn(`⚠️  Missing tables: ${missingTables.join(", ")}`)
      return { success: false, message: `Missing tables: ${missingTables.join(", ")}` }
    }
  } catch (error) {
    console.error("❌ Database connection error:", error)
    throw error
  }
}

/**
 * الحصول على إحصائيات قاعدة البيانات
 */
export async function getDatabaseStats() {
  try {
    const stats = {
      users: await prisma.user.count(),
      products: await prisma.product.count(),
      orders: await prisma.order.count(),
      reviews: await prisma.review.count(),
      customOrders: await prisma.customOrder.count(),
      sampleRequests: await prisma.sampleRequest.count(),
      priceAlerts: await prisma.priceAlert.count(),
    }

    return stats
  } catch (error) {
    console.error("Error getting database stats:", error)
    throw error
  }
}

/**
 * التحقق من وجود مستخدمين أساسيين
 */
export async function checkDefaultUsers() {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@packagingplatform.com" },
    })

    const manufacturer = await prisma.user.findUnique({
      where: { email: "manufacturer1@example.com" },
    })

    const trader = await prisma.user.findUnique({
      where: { email: "trader1@example.com" },
    })

    return {
      admin: !!admin,
      manufacturer: !!manufacturer,
      trader: !!trader,
      allExists: !!(admin && manufacturer && trader),
    }
  } catch (error) {
    console.error("Error checking default users:", error)
    throw error
  }
}
