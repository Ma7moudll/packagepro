"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { vendorsApi } from "@/lib/api/vendors"
import type { VendorDashboard } from "@/lib/api/vendors"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Plus, Eye, TrendingUp, AlertCircle, DollarSign, ShoppingCart, FileText } from "lucide-react"

export default function ManufacturerDashboard() {
  const router = useRouter()
  const { language } = useLanguage()
  const { user, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<VendorDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    try {
      const res = await vendorsApi.getDashboard()
      if (res.success) {
        setData(res.data)
      }
    } catch (err) {
      console.error("Dashboard load error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
    if (user) {
      loadDashboard()
    }
  }, [user, authLoading, router, loadDashboard])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!user) return null

  const stats = data?.stats

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {language === "ar" ? "لوحة تحكم المورد" : "Vendor Dashboard"}
        </h1>
        <p className="mt-1 text-gray-500">
          {language === "ar" ? "مرحباً بعودتك" : `Welcome back, ${data?.vendor?.companyName || user.name}`}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              {language === "ar" ? "الطلبات النشطة" : "Active Orders"}
            </CardTitle>
            <Package className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats?.activeOrders || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              {language === "ar" ? "بانتظار القبول" : "Pending Handshakes"}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{data?.pendingHandshakes?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              {language === "ar" ? "إجمالي المدفوعات" : "Total Paid"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {stats?.totalPaid?.toLocaleString() || "0"} {language === "ar" ? "جنيه" : "EGP"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              {language === "ar" ? "التقييم" : "Rating"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">
              {data?.vendor?.qualityRating != null ? data.vendor.qualityRating.toFixed(1) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-sm">
            {language === "ar" ? "إجراءات سريعة" : "Quick Actions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/manufacturer/orders">
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs">{language === "ar" ? "عرض الطلبات" : "View Orders"}</span>
              </Button>
            </Link>
            <Link href="/manufacturer/quotes">
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <FileText className="h-5 w-5" />
                <span className="text-xs">{language === "ar" ? "عروض الأسعار" : "Quotes"}</span>
              </Button>
            </Link>
            <Link href="/manufacturer/products">
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <Package className="h-5 w-5" />
                <span className="text-xs">{language === "ar" ? "المنتجات" : "Products"}</span>
              </Button>
            </Link>
            <Link href="/manufacturer/products/new">
              <Button variant="outline" className="w-full h-20 flex-col gap-1">
                <Plus className="h-5 w-5" />
                <span className="text-xs">{language === "ar" ? "إضافة منتج" : "Add Product"}</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            {language === "ar" ? "الطلبات الأخيرة" : "Recent Orders"}
          </CardTitle>
          <Link href="/manufacturer/orders">
            <Button variant="outline" size="sm">
              {language === "ar" ? "عرض الكل" : "View All"}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data?.activeOrders && data.activeOrders.length > 0 ? (
            <div className="space-y-3">
              {data.activeOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-sm">#{order.poNumber || order.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                      {order.order?.orderNumber ? `Order #${order.order.orderNumber}` : "Purchase Order"}
                    </p>
                  </div>
                  <Badge>{order.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              {language === "ar" ? "لا توجد طلبات نشطة" : "No active orders"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

