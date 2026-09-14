"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2, Truck, RotateCcw, FileCheck2, PackageCheck, MapPin } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ordersApi } from "@/lib/api/orders"
import { financeApi } from "@/lib/api/finance"
import {
  currencyOf,
  daysUntilEta,
  isPaid,
  orderTotal,
  shippingOf,
  subtotalOf,
  taxOf,
  trackingNumber,
} from "@/lib/orders/projections"
import { OrderTimeline } from "@/components/orders/order-timeline"
import type { Order } from "@shared/types"

export default function OrderDetailPage() {
  const { language } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const orderId = (params.id as string) || ""

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [notice, setNotice] = useState("")

  const t = (en: string, ar: string) => (language === "ar" ? ar : en)

  const currency = order ? currencyOf(order) : "USD"
  const shippingCost = order ? shippingOf(order) : 0
  const canGetInvoice = order ? isPaid(order) : false
  const orderTrackNo = order ? trackingNumber(order) : null
  const etaDays = order ? daysUntilEta(order) : null

  useEffect(() => {
    loadOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const loadOrder = async () => {
    setLoading(true)
    try {
      const res = await ordersApi.getById(orderId)
      if (res.success) {
        setOrder(res.data)
      }
    } catch (error) {
      console.error("Error loading order:", error)
    } finally {
      setLoading(false)
    }
  }

  const reorderable =
    !!order &&
    (order.status === "delivered" || order.status === "completed") &&
    order.items.length > 0

  const handleReorder = async () => {
    if (!order) return
    setReordering(true)
    setNotice("")
    try {
      await ordersApi.reorder(order)
      router.push("/cart")
    } catch (error) {
      console.error("Reorder failed:", error)
      setNotice(t("Could not reorder this order. Please try again.", "تعذر إعادة الطلب. حاول مرة أخرى."))
    } finally {
      setReordering(false)
    }
  }

  const handleInvoice = async () => {
    if (!order) return
    setDownloading(true)
    setNotice("")
    try {
      await financeApi.saveInvoice(order.id, order.orderNumber)
    } catch (error) {
      console.error("Invoice download failed:", error)
      setNotice(t("Could not download the invoice. Please try again.", "تعذر تحميل الفاتورة. حاول مرة أخرى."))
    } finally {
      setDownloading(false)
    }
  }

  const shipment = order?.shipment

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{t("Order not found", "الطلب غير موجود")}</p>
          <Link href="/orders">
            <Button variant="outline">{t("Back to Orders", "العودة للطلبات")}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">{t("Order Details", "تفاصيل الطلب")}</h1>
          <p className="text-slate-500">
            {t("Order", "رقم الطلب")}: {order.orderNumber}
          </p>
        </div>
        <Badge className="text-sm px-3 py-1">{order.status.replace(/_/g, " ")}</Badge>
      </div>

      {notice && <p className="mb-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{notice}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">{t("Order Status", "حالة الطلب")}</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline status={order.status} />
          </CardContent>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* State CTA */}
          {order.status === "awaiting_approval" && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-800">
                      {t("Your design proof is ready", "نموذج التصميم الخاص بك جاهز")}
                    </p>
                    <p className="text-sm text-emerald-700">
                      {t("Approve it to move your order into production.", "اعتمده لنقل طلبك إلى الإنتاج.")}
                    </p>
                  </div>
                </div>
                <Link href={`/orders/${order.id}/approve`}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    {t("Review & Approve", "مراجعة واعتماد")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {reorderable && (
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <PackageCheck className="h-8 w-8 text-slate-600" />
                  <div>
                    <p className="font-semibold text-slate-800">
                      {t("Need more units?", "تحتاج المزيد من الكمية؟")}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t("Reorder the same design and specs in one click.", "أعد طلب نفس التصميم والمواصفات بنقرة واحدة.")}
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleReorder} disabled={reordering}>
                  {reordering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  {t("Reorder", "إعادة الطلب")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {t("Shipment Tracking", "تتبع الشحنة")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipment ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t("Status", "الحالة")}</span>
                    <Badge variant="outline">{(shipment.status || "").replace(/_/g, " ")}</Badge>
                  </div>
                  {(shipment.dhlTrackingNumber || shipment.trackingNumber) && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t("Tracking number", "رقم التتبع")}</span>
                      <span className="font-mono text-sm">
                        {orderTrackNo}
                      </span>
                    </div>
                  )}
                  {shipment.estimatedDeliveryDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t("Estimated delivery", "التسليم المتوقع")}</span>
                      <span className="font-medium">
                        {new Date(shipment.estimatedDeliveryDate).toLocaleDateString()}
                        {etaDays !== null && etaDays > 0 && (
                          <span className="text-slate-400 block text-xs">
                            {t("about", "")}
                            {etaDays} {t("days", "أيام")}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {Array.isArray(shipment.trackingEvents) && shipment.trackingEvents.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                        {t("Tracking events", "أحداث التتبع")}
                      </p>
                      <ul className="space-y-1.5">
                        {(shipment.trackingEvents as Array<{ status?: string; description?: string; timestamp?: string }>).map(
                          (ev, i) => (
                            <li key={i} className="flex justify-between gap-4 text-xs text-slate-600">
                              <span className="capitalize">{(ev.status || ev.description || "").replace(/_/g, " ")}</span>
                              {ev.timestamp && (
                                <span className="text-slate-400 whitespace-nowrap">
                                  {new Date(ev.timestamp).toLocaleDateString()}
                                </span>
                              )}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                  {!shipment.dhlTrackingNumber && !shipment.estimatedDeliveryDate && (
                    <p className="text-slate-400 text-xs">
                      {t(
                        "Shipment will be created once the order leaves production.",
                        "سيتم إنشاء الشحنة عند خروج الطلب من الإنتاج.",
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  {t("No shipment yet.", "لا توجد شحنة بعد.")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t("Shipping Address", "عنوان الشحن")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 whitespace-pre-line">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                {"\n"}
                {order.shippingAddress.street}
                {"\n"}
                {order.shippingAddress.city}
                {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""} {order.shippingAddress.postalCode}
                {"\n"}
                {order.shippingAddress.country}
              </p>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Payment Information", "معلومات الدفع")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{t("Status", "الحالة")}</span>
                  <Badge variant="outline">{order.paymentStatus}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t("Method", "الطريقة")}</span>
                  <span className="capitalize">{order.paymentMethod}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Items", "المنتجات")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium capitalize">{item.productType}</p>
                      <p className="text-sm text-slate-500">
                        {t("Qty", "الكمية")}: {item.quantity} &middot; {item.dimensions.length}×{item.dimensions.width}
                        {item.dimensions.height ? `×${item.dimensions.height}` : ""}
                        {item.dimensions.unit || "mm"}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {Number(item.totalPrice).toFixed(2)} {currency}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{t("Subtotal", "المجموع الفرعي")}</span>
                  <span>{subtotalOf(order).toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{t("Tax", "الضريبة")}</span>
                  <span>{taxOf(order).toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{t("Shipping", "الشحن")}</span>
                  <span>
                    {shippingCost === 0
                      ? t("Free", "مجاني")
                      : `${shippingCost.toFixed(2)} ${currency}`}
                  </span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>{t("Total", "الإجمالي")}</span>
                  <span>{orderTotal(order).toFixed(2)} {currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 flex-wrap">
            {canGetInvoice && (
              <Button variant="outline" onClick={handleInvoice} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {t("Download Invoice", "تحميل الفاتورة")}
              </Button>
            )}
            <Link href="/orders">
              <Button variant="outline">{t("Back to Orders", "العودة للطلبات")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}