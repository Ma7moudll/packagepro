"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Eye, Download } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Order } from "@/lib/ecommerce/types"
import Link from "next/link"

export default function OrdersPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const response = await fetch("/api/ecommerce/orders")
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-emerald-500"
      case "shipped":
        return "bg-blue-500"
      case "processing":
        return "bg-yellow-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-slate-500"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">
          {language === "ar" ? "جارٍ التحميل..." : "Loading..."}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">
          {language === "ar" ? "طلباتي" : "My Orders"}
        </h1>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {language === "ar" ? "لا توجد طلبات" : "No orders yet"}
            </h2>
            <p className="text-slate-600 mb-6">
              {language === "ar"
                ? "ابدأ التسوق لإضافة طلباتك الأولى"
                : "Start shopping to add your first orders"}
            </p>
            <Link href="/">
              <Button>
                {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg">
                          {language === "ar" ? "رقم الطلب" : "Order"}: {order.orderNumber}
                        </h3>
                        <Badge className={getStatusColor(order.orderStatus)}>
                          {order.orderStatus}
                        </Badge>
                        <Badge variant="outline">{order.paymentStatus}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-600 mb-4">
                        {order.items.length}{" "}
                        {language === "ar" ? "منتج" : "item(s)"} • {order.total.toFixed(2)}{" "}
                        {order.currency}
                      </p>
                      {order.trackingNumber && (
                        <p className="text-sm text-emerald-600">
                          {language === "ar" ? "رقم التتبع" : "Tracking"}: {order.trackingNumber}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          {language === "ar" ? "عرض" : "View"}
                        </Button>
                      </Link>
                      {order.invoiceId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const response = await fetch(
                              `/api/ecommerce/invoices/${order.invoiceId}/download`
                            )
                            const blob = await response.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement("a")
                            a.href = url
                            a.download = `invoice-${order.orderNumber}.pdf`
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            window.URL.revokeObjectURL(url)
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {language === "ar" ? "فاتورة" : "Invoice"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
