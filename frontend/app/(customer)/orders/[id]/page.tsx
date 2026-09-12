"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ordersApi } from "@/lib/api/orders"
import { OrderTimeline } from "@/components/orders/order-timeline"
import type { Order } from "@shared/types"
import Link from "next/link"

export default function OrderDetailPage() {
  const { language } = useLanguage()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
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
          <p className="text-slate-500 mb-4">
            {language === "ar" ? "الطلب غير موجود" : "Order not found"}
          </p>
          <Link href="/orders">
            <Button variant="outline">
              {language === "ar" ? "العودة للطلبات" : "Back to Orders"}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            {language === "ar" ? "تفاصيل الطلب" : "Order Details"}
          </h1>
          <p className="text-slate-500">
            {language === "ar" ? "رقم الطلب" : "Order"}: {order.orderNumber}
          </p>
        </div>
        <Badge className="text-sm px-3 py-1">
          {order.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">
              {language === "ar" ? "حالة الطلب" : "Order Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <OrderTimeline status={order.status} />
          </CardContent>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {language === "ar" ? "عنوان الشحن" : "Shipping Address"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                <br />
                {order.shippingAddress.country}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {language === "ar" ? "معلومات الدفع" : "Payment Information"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{language === "ar" ? "الحالة" : "Status"}</span>
                  <Badge variant="outline">{order.paymentStatus}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{language === "ar" ? "الطريقة" : "Method"}</span>
                  <span className="capitalize">{order.paymentMethod}</span>
                </div>
                {order.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">{language === "ar" ? "رقم التتبع" : "Tracking"}</span>
                    <span className="font-mono text-sm">{order.trackingNumber}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {language === "ar" ? "المنتجات" : "Items"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium capitalize">{item.productType}</p>
                      <p className="text-sm text-slate-500">
                        {language === "ar" ? "الكمية" : "Qty"}: {item.quantity} &middot; {item.dimensions.length}×{item.dimensions.width}{item.dimensions.height ? `×${item.dimensions.height}` : ""}{item.dimensions.unit}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {item.totalPrice.toFixed(2)} {order.currency}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{language === "ar" ? "المجموع الفرعي" : "Subtotal"}</span>
                  <span>{order.subtotal.toFixed(2)} {order.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{language === "ar" ? "الضريبة" : "Tax"}</span>
                  <span>{order.tax.toFixed(2)} {order.currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{language === "ar" ? "الشحن" : "Shipping"}</span>
                  <span>
                    {order.shipping === 0
                      ? language === "ar" ? "مجاني" : "Free"
                      : `${order.shipping.toFixed(2)} ${order.currency}`}
                  </span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>{language === "ar" ? "الإجمالي" : "Total"}</span>
                  <span>{order.total.toFixed(2)} {order.currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            {order.invoiceId && (
              <Button variant="outline" onClick={async () => {
                try {
                  const res = await fetch(`/api/ecommerce/invoices/${order.invoiceId}/download`)
                  const blob = await res.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `invoice-${order.orderNumber}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  window.URL.revokeObjectURL(url)
                } catch (e) {
                  console.error("Invoice download failed:", e)
                }
              }}>
                <Download className="h-4 w-4 ml-2" />
                {language === "ar" ? "تحميل الفاتورة" : "Download Invoice"}
              </Button>
            )}
            <Link href="/orders">
              <Button variant="outline">
                {language === "ar" ? "العودة للطلبات" : "Back to Orders"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
