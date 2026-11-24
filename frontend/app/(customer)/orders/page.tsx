"use client"
import { RecordedReleaseNote } from "@/components/orders/recorded-release-note"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Eye, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { ordersApi } from "@/lib/api/orders"
import { financeApi } from "@/lib/api/finance"
import { currencyOf, isPaid, orderTotal, trackingNumber } from "@/lib/orders/projections"
import type { Order, OrderStatus } from "@shared/types"

const PAGE_SIZE = 8

const FILTERS: { key: OrderStatus | "all"; labelEn: string; labelAr: string }[] = [
  { key: "all", labelEn: "All", labelAr: "الكل" },
  { key: "awaiting_approval", labelEn: "Awaiting Approval", labelAr: "بانتظار الموافقة" },
  { key: "in_production", labelEn: "In Production", labelAr: "قيد الإنتاج" },
  { key: "shipped", labelEn: "Shipped", labelAr: "تم الشحن" },
  { key: "delivered", labelEn: "Delivered", labelAr: "تم التوصيل" },
  { key: "completed", labelEn: "Completed", labelAr: "مكتمل" },
  { key: "cancelled", labelEn: "Cancelled", labelAr: "ملغي" },
]

export default function OrdersPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | "all">("all")
  const [page, setPage] = useState(1)
  const [downloading, setDownloading] = useState<string | null>(null)

  const t = (en: string, ar: string) => (language === "ar" ? ar : en)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/orders")
      return
    }
    if (user) loadAllOrders()
  }, [user, authLoading, router])

  const loadAllOrders = async () => {
    setLoading(true)
    try {
      let all: Order[] = []
      let pageNum = 1
      // Consume the server pagination envelope end-to-end so filters below
      // operate on the customer's full order history, not just one page.
      for (;;) {
        const res = await ordersApi.list({ page: pageNum, limit: 100 })
        if (!res.success || !Array.isArray(res.data)) break
        all = all.concat(res.data)
        const total = res.pagination?.total ?? all.length
        const totalPages = res.pagination?.totalPages ?? 1
        if (pageNum >= totalPages || all.length >= total) break
        pageNum += 1
      }
      setOrders(all)
    } catch (error: any) {
      if (error?.status === 401) {
        router.push("/login?redirect=/orders")
        return
      }
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const base = filter === "all" ? orders : orders.filter((o) => o.status === filter)
    return [...base].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [orders, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
      case "completed":
        return "bg-emerald-500"
      case "shipped":
        return "bg-blue-500"
      case "in_production":
      case "ready_to_ship":
        return "bg-yellow-500"
      case "awaiting_approval":
      case "pending_review":
        return "bg-amber-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-slate-500"
    }
  }

  const handleInvoice = async (order: Order) => {
    setDownloading(order.id)
    try {
      await financeApi.saveInvoice(order.id, order.orderNumber)
    } catch (error) {
      console.error("Invoice download failed:", error)
    } finally {
      setDownloading(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">{t("My Orders", "طلباتي")}</h1>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key)
                  setPage(1)
                }}
                className={
                  active
                    ? "px-3 py-1.5 rounded-full bg-slate-900 text-white text-sm font-medium"
                    : "px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100"
                }
              >
                {language === "ar" ? f.labelAr : f.labelEn}
                <span className="ml-1.5 text-xs opacity-70">
                  ({filter === "all" ? orders.length : orders.filter((o) => o.status === f.key).length})
                </span>
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t("No orders yet", "لا توجد طلبات")}</h2>
            <p className="text-slate-600 mb-6">
              {t("Start shopping to add your first orders", "ابدأ التسوق لإضافة طلباتك الأولى")}
            </p>
            <Link href="/">
              <Button>{t("Browse Products", "تصفح المنتجات")}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((order) => {
              return (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <RecordedReleaseNote status={order.status} />
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[240px]">
                        <div className="flex items-center gap-4 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg">
                            {t("Order", "رقم الطلب")}: {order.orderNumber}
                          </h3>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                          <Badge variant="outline">{order.paymentStatus}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-slate-600 mb-2">
                          {order.items?.length || 0} {t("item(s)", "منتج")} • {orderTotal(order).toFixed(2)}{" "}
                          {currencyOf(order)}
                        </p>
                        {trackingNumber(order) && (
                          <p className="text-sm text-emerald-600">
                            {t("Tracking", "رقم التتبع")}: {trackingNumber(order)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {t("View", "عرض")}
                          </Button>
                        </Link>
                        {isPaid(order) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInvoice(order)}
                            disabled={downloading === order.id}
                          >
                            {downloading === order.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            {t("Invoice", "فاتورة")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("Prev", "سابق")}
                </Button>
                <span className="text-sm text-slate-500">
                  {t("Page", "صفحة")} {safePage} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  {t("Next", "التالي")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}