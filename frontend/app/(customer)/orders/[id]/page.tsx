"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Package, Truck, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Order } from "@/lib/ecommerce/types"
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
      const response = await fetch(`/api/ecommerce/orders/${orderId}`)
      const data = await response.json()
      setOrder(data)
    } catch (error) {
      console.error("Error loading order:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!order) return

    try {
      const response = await fetch(`/api/ecommerce/invoices/${order.invoiceId}/download`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${order.orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading invoice:", error)
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

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {language === "ar" ? "تفاصيل الطلب" : "Order Details"}
            </h1>
            <p className="text-slate-600">
              {language === "ar" ? "رقم الطلب" : "Order Number"}: {order.orderNumber}
            </p>
          </div>
          <Badge className={getStatusColor(order.orderStatus)}>
            {order.orderStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                {order.shippingAddress.address}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.zipCode}
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
                  <span className="text-slate-600">
                    {language === "ar" ? "الحالة" : "Status"}
                  </span>
                  <Badge variant="outline">{order.paymentStatus}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    {language === "ar" ? "الطريقة" : "Method"}
                  </span>
                  <span className="capitalize">{order.paymentMethod.type}</span>
                </div>
                {order.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      {language === "ar" ? "رقم التتبع" : "Tracking"}
                    </span>
                    <span>{order.trackingNumber}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {language === "ar" ? "المنتجات" : "Items"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-slate-500">
                      {language === "ar" ? "الكمية" : "Quantity"}: {item.quantity} • SKU: {item.sku}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {(item.price * item.quantity).toFixed(2)} {order.currency}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "المجموع الفرعي" : "Subtotal"}
                </span>
                <span>{order.subtotal.toFixed(2)} {order.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "الضريبة" : "Tax"}
                </span>
                <span>{order.tax.toFixed(2)} {order.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "الشحن" : "Shipping"}
                </span>
                <span>
                  {order.shipping === 0
                    ? language === "ar"
                      ? "مجاني"
                      : "Free"
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
            <Button variant="outline" onClick={handleDownloadInvoice}>
              <Download className="h-4 w-4 mr-2" />
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
  )
}

