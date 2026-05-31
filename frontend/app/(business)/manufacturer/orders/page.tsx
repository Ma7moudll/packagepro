"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { ShoppingCart, Eye, Package } from "lucide-react"
import Link from "next/link"

export default function ManufacturerOrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  interface Order {
    id: string
    customer: string
    customerEn: string
    product: string
    productEn: string
    quantity: number
    total: number
    status: string
    date: string
  }
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    // Fetch orders
    const fetchOrders = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500))
        setOrders([
          {
            id: "ORD-1001",
            customer: "شركة الأهرام",
            customerEn: "Al-Ahram Company",
            product: "علب كرتون مموج",
            productEn: "Corrugated Boxes",
            quantity: 500,
            total: 1250,
            status: "processing",
            date: "2024-01-15",
          },
          {
            id: "ORD-1002",
            customer: "مطعم النيل",
            customerEn: "Nile Restaurant",
            product: "أكياس ورق كرافت",
            productEn: "Kraft Paper Bags",
            quantity: 2000,
            total: 500,
            status: "shipped",
            date: "2024-01-14",
          },
          {
            id: "ORD-1003",
            customer: "كافيه القاهرة",
            customerEn: "Cairo Cafe",
            product: "أكواب ورقية ساخنة",
            productEn: "Hot Paper Cups",
            quantity: 10000,
            total: 1500,
            status: "pending",
            date: "2024-01-13",
          },
        ])
      } catch (error) {
        console.error("Error fetching orders:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [user, router])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: { ar: string; en: string }; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: { ar: "قيد الانتظار", en: "Pending" }, variant: "secondary" },
      processing: { label: { ar: "قيد المعالجة", en: "Processing" }, variant: "default" },
      shipped: { label: { ar: "تم الشحن", en: "Shipped" }, variant: "outline" },
      delivered: { label: { ar: "تم التسليم", en: "Delivered" }, variant: "default" },
    }
    const statusInfo = statusMap[status] || statusMap.pending
    return (
      <Badge variant={statusInfo.variant}>
        {language === "ar" ? statusInfo.label.ar : statusInfo.label.en}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {language === "ar" ? "الطلبات" : "Orders"}
        </h1>
        <p className="text-slate-600">
          {language === "ar" ? "إدارة طلبات العملاء" : "Manage customer orders"}
        </p>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold">{order.id}</h3>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-slate-600 mb-2">
                    {language === "ar" ? order.customer : order.customerEn}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center">
                      <Package className="h-4 w-4 mr-1" />
                      {language === "ar" ? order.product : order.productEn} × {order.quantity}
                    </span>
                    <span>{order.date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600 mb-4">
                    {order.total.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
                  </p>
                  <Button asChild variant="outline">
                    <Link href={`/manufacturer/orders/${order.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      {language === "ar" ? "عرض التفاصيل" : "View Details"}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.length === 0 && !loading && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">
            {language === "ar" ? "لا توجد طلبات" : "No orders found"}
          </p>
        </div>
      )}
    </div>
  )
}

