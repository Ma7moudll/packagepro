"use client"
import { RecordedReleaseNote } from "@/components/orders/recorded-release-note"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { vendorsApi, num, type PurchaseOrder } from "@/lib/api/vendors"
import { ShoppingCart, Eye, Package, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function ManufacturerOrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    const fetchOrders = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await vendorsApi.getOrders({ limit: 50 })
        if (res.success && res.data) {
          setOrders(res.data as unknown as PurchaseOrder[])
        }
      } catch (err: any) {
        console.error("Error fetching orders:", err)
        setError(err.message || "Failed to fetch orders")
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [user, router])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: { ar: string; en: string }; className: string }> = {
      pending: { label: { ar: "قيد الانتظار", en: "Pending" }, className: "bg-yellow-100 text-yellow-800" },
      confirmed: { label: { ar: "مؤكد", en: "Confirmed" }, className: "bg-blue-100 text-blue-800" },
      in_production: { label: { ar: "قيد الإنتاج", en: "In Production" }, className: "bg-purple-100 text-purple-800" },
      quality_check: { label: { ar: "فحص الجودة", en: "Quality Check" }, className: "bg-indigo-100 text-indigo-800" },
      ready_to_ship: { label: { ar: "جاهز للشحن", en: "Ready to Ship" }, className: "bg-teal-100 text-teal-800" },
      shipped: { label: { ar: "تم الشحن", en: "Shipped" }, className: "bg-blue-100 text-blue-800" },
      delivered: { label: { ar: "تم التسليم", en: "Delivered" }, className: "bg-green-100 text-green-800" },
      completed: { label: { ar: "مكتمل", en: "Completed" }, className: "bg-green-100 text-green-800" },
      cancelled: { label: { ar: "ملغي", en: "Cancelled" }, className: "bg-red-100 text-red-800" },
    }
    const statusInfo = statusMap[status] || statusMap.pending
    return (
      <Badge className={statusInfo.className}>
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

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((po) => (
          <Card key={po.id}>
            <CardContent className="p-6">
              <RecordedReleaseNote status={po.status === "ready_to_ship" || po.order?.status === "ready_to_ship" ? "ready_to_ship" : undefined} />
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold">#{po.poNumber}</h3>
                    {getStatusBadge(po.status)}
                  </div>
                  <p className="text-slate-600 mb-2">
                    {po.order?.shippingName || po.order?.shippingAddress?.name || "—"}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center">
                      <Package className="h-4 w-4 mr-1" />
                      {po.order?.items?.length || 0} {language === "ar" ? "منتج" : "items"}
                    </span>
                    <span>{new Date(po.createdAt).toLocaleDateString()}</span>
                    {po.order?.orderNumber ? (
                      <span className="text-slate-400">Order #{po.order.orderNumber}</span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600 mb-4">
                    {num(po.vendorCost).toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
                  </p>
                  <Button asChild variant="outline">
                    <Link href={`/manufacturer/orders/${po.orderId}`}>
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