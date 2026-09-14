"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Receipt, Loader2, Download, CreditCard, AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { ordersApi } from "@/lib/api/orders"
import { financeApi } from "@/lib/api/finance"
import {
  billingStats,
  currencyOf,
  isFailedStatus,
  isPayingStatus,
  orderTotal,
} from "@/lib/orders/projections"
import type { Order } from "@shared/types"

export default function BillingPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  const t = (en: string, ar: string) => (language === "ar" ? ar : en)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/billing")
      return
    }
    if (user) loadOrders()
  }, [user, authLoading, router])

  const loadOrders = async () => {
    setLoading(true)
    try {
      let all: Order[] = []
      let pageNum = 1
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
        router.push("/login?redirect=/billing")
        return
      }
      console.error("Error loading billing data:", error)
    } finally {
      setLoading(false)
    }
  }

  const { bills, paidOrders, totalSpent, currency } = useMemo(
    () => billingStats(orders),
    [orders],
  )

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
        <h1 className="text-3xl font-bold mb-6">{t("Billing & Invoices", "الفواتير والمدفوعات")}</h1>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 mb-1">{t("Total paid", "إجمالي المدفوعات")}</p>
              <p className="text-3xl font-bold">
                {totalSpent.toFixed(2)} {currency}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500 mb-1">{t("Orders billed", "الطلبات المفوترة")}</p>
              <p className="text-3xl font-bold">{paidOrders.length}</p>
            </CardContent>
          </Card>
        </div>

        {bills.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t("No invoices yet", "لا توجد فواتير بعد")}</h2>
            <p className="text-slate-600 mb-6">
              {t("Your invoices and payment history will appear here.", "ستظهر فواتيرك وسجل المدفوعات هنا.")}
            </p>
            <Link href="/">
              <Button>{t("Browse Products", "تصفح المنتجات")}</Button>
            </Link>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Payment history", "سجل المدفوعات")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {bills.map((order) => {
                  const amount = orderTotal(order)
                  const payment = order.paymentStatus || "pending"
                  return (
                    <div key={order.id} className="flex items-center justify-between gap-4 p-4 sm:px-6 flex-wrap">
                      <div>
                        <p className="font-medium">
                          <Link href={`/orders/${order.id}`} className="hover:text-emerald-700">
                            {order.orderNumber}
                          </Link>
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold">
                          {amount.toFixed(2)} {currencyOf(order)}
                        </span>
                        {isPayingStatus(payment) ? (
                          <Badge className="bg-emerald-100 text-emerald-800">{payment}</Badge>
                        ) : isFailedStatus(payment) ? (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {payment}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{payment}</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInvoice(order)}
                          disabled={
                            downloading === order.id ||
                            !isPayingStatus(payment)
                          }
                        >
                          {downloading === order.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {t("Invoice", "فاتورة")}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex items-center gap-2 text-slate-400 text-sm">
          <CreditCard className="h-4 w-4" />
          {t(
            "Invoice PDFs are generated securely from your order records.",
            "يتم إنشاء ملفات PDF للفواتير بشكل آمن من سجلات طلباتك.",
          )}
        </div>
      </div>
    </div>
  )
}