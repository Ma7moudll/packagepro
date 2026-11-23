"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { ordersApi } from "@/lib/api/orders"
import type { Order } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, AlertCircle, Eye } from "lucide-react"

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  shipped: "bg-blue-100 text-blue-800",
  in_production: "bg-yellow-100 text-yellow-800",
  pending_review: "bg-slate-100 text-slate-800",
  awaiting_approval: "bg-amber-100 text-amber-800",
  vendor_confirmed: "bg-indigo-100 text-indigo-800",
}

function statusBadge(status: string): string {
  return STATUS_BADGE[status] || "bg-gray-100 text-gray-800"
}

export default function DashboardPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { user, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      setError(null)
      const res = await ordersApi.list({ limit: 50 })
      if (res.success) {
        setOrders(res.data)
      }
    } catch (err: any) {
      setError(
        language === "ar"
          ? "فشل تحميل الطلبات. حاول مرة أخرى"
          : "Failed to load orders. Please try again"
      )
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
    if (user) {
      loadOrders()
    }
  }, [user, authLoading, router, loadOrders])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!user) return null

  const activeOrders = orders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled"
  )
  const completedOrders = orders.filter((o) => o.status === "completed" || o.status === "delivered")

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {language === "ar" ? "لوحة التحكم" : "Dashboard"}
        </h1>
        <p className="mt-1 text-gray-500">
          {language === "ar" ? "مرحباً بك في لوحة التحكم" : `Welcome back, ${user.name}`}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={loadOrders}>
            {language === "ar" ? "إعادة المحاولة" : "Retry"}
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {language === "ar" ? "الطلبات النشطة" : "Active Orders"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {language === "ar" ? "إجمالي الطلبات" : "Total Orders"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {language === "ar" ? "الطلبات المكتملة" : "Completed"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{completedOrders.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{language === "ar" ? "الطلبات الأخيرة" : "Recent Orders"}</CardTitle>
          <Link href="/orders">
            <Button variant="outline" size="sm">
              {language === "ar" ? "عرض الكل" : "View All"}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-4">
                {language === "ar" ? "لا توجد طلبات حتى الآن" : "No orders yet"}
              </p>
              <Link href="/products">
                <Button>{language === "ar" ? "تصفح المنتجات" : "Browse Products"}</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      {language === "ar" ? "رقم الطلب" : "Order"}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      {language === "ar" ? "الحالة" : "Status"}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      {language === "ar" ? "التاريخ" : "Date"}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                      {language === "ar" ? "الإجمالي" : "Total"}
                    </th>
                    <th className="text-right py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusBadge(order.status)}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString(
                          language === "ar" ? "ar-SA" : "en-US"
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {order.total.toFixed(2)} EGP
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
