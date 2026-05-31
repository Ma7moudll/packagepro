"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, Phone, Mail } from "lucide-react"
import Link from "next/link"

export default function ManufacturerOrderDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()

  const orderId = Array.isArray(params.id) ? params.id[0] : params.id
  const [loading, setLoading] = useState(true)
  interface Order {
    id: string
    customer: string
    customerEn: string
    customerEmail: string
    customerPhone: string
    product: string
    productEn: string
    quantity: number
    unitPrice: number
    total: number
    subtotal: number
    shipping: number
    tax: number
    finalTotal: number
    status: string
    date: string
    deliveryDate: string
    shippingAddress: string
    shippingAddressEn: string
    notes?: string
    notesEn?: string
    trackingNumber?: string
  }
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    // Fetch order data
    const fetchOrder = async () => {
      try {
        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Mock order data - in real app, fetch from API
        const mockOrders: Record<string, Order> = {
          "ORD-1001": {
            id: "ORD-1001",
            customer: "شركة الأهرام",
            customerEn: "Al-Ahram Company",
            customerEmail: "contact@alahram.com",
            customerPhone: "+20 123 456 7890",
            product: "علب كرتون مموج",
            productEn: "Corrugated Boxes",
            quantity: 500,
            unitPrice: 2.5,
            total: 1250,
            subtotal: 1250,
            shipping: 50,
            tax: 100,
            finalTotal: 1400,
            status: "processing",
            date: "2024-01-15",
            deliveryDate: "2024-01-25",
            shippingAddress: "123 شارع النيل، القاهرة، مصر",
            shippingAddressEn: "123 Nile Street, Cairo, Egypt",
            notes: "يرجى التأكد من التغليف بعناية",
            notesEn: "Please ensure careful packaging",
          },
          "ORD-1002": {
            id: "ORD-1002",
            customer: "مطعم النيل",
            customerEn: "Nile Restaurant",
            customerEmail: "info@nilerestaurant.com",
            customerPhone: "+20 987 654 3210",
            product: "أكياس ورق كرافت",
            productEn: "Kraft Paper Bags",
            quantity: 2000,
            unitPrice: 0.25,
            total: 500,
            subtotal: 500,
            shipping: 30,
            tax: 40,
            finalTotal: 570,
            status: "shipped",
            date: "2024-01-14",
            deliveryDate: "2024-01-22",
            shippingAddress: "456 شارع التحرير، الجيزة، مصر",
            shippingAddressEn: "456 Tahrir Street, Giza, Egypt",
            trackingNumber: "TRACK123456",
            notes: "",
            notesEn: "",
          },
        }

        setOrder(mockOrders[orderId as string])
      } catch (error) {
        console.error("Error fetching order:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [user, router, orderId])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-slate-600">{language === "ar" ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-slate-600">{language === "ar" ? "الطلب غير موجود" : "Order not found"}</p>
          <Button asChild className="mt-4">
            <Link href="/manufacturer/orders">
              {language === "ar" ? "العودة للطلبات" : "Back to Orders"}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "shipped":
        return <Truck className="h-5 w-5 text-blue-600" />
      case "processing":
        return <Package className="h-5 w-5 text-orange-600" />
      default:
        return <Clock className="h-5 w-5 text-slate-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: { ar: string; en: string }; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      pending: {
        label: { ar: "قيد الانتظار", en: "Pending" },
        variant: "secondary",
        className: "bg-yellow-100 text-yellow-800"
      },
      processing: {
        label: { ar: "قيد المعالجة", en: "Processing" },
        variant: "default",
        className: "bg-blue-100 text-blue-800"
      },
      shipped: {
        label: { ar: "تم الشحن", en: "Shipped" },
        variant: "outline",
        className: "bg-purple-100 text-purple-800"
      },
      delivered: {
        label: { ar: "تم التسليم", en: "Delivered" },
        variant: "default",
        className: "bg-green-100 text-green-800"
      },
    }
    const statusInfo = statusMap[status] || statusMap.pending
    return (
      <Badge className={statusInfo.className}>
        {getStatusIcon(status)}
        <span className="ml-2">{language === "ar" ? statusInfo.label.ar : statusInfo.label.en}</span>
      </Badge>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/manufacturer/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {language === "ar" ? "تفاصيل الطلب" : "Order Details"}
            </h1>
            <p className="text-slate-600">#{order.id}</p>
          </div>
        </div>
        {getStatusBadge(order.status)}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "تفاصيل الطلب" : "Order Items"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {language === "ar" ? order.product : order.productEn}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {language === "ar" ? "الكمية" : "Quantity"}: {order.quantity.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600">
                    {language === "ar" ? "سعر الوحدة" : "Unit Price"}: {order.unitPrice.toFixed(2)} {language === "ar" ? "جنيه" : "EGP"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-emerald-600">
                    {order.total.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "معلومات العميل" : "Customer Information"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-lg">
                  {language === "ar" ? order.customer : order.customerEn}
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{order.customerEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{order.customerPhone}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {language === "ar" ? "عنوان الشحن" : "Shipping Address"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                {language === "ar" ? order.shippingAddress : order.shippingAddressEn}
              </p>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "ملاحظات" : "Notes"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">
                  {language === "ar" ? order.notes : order.notesEn}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "ملخص الطلب" : "Order Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>{language === "ar" ? "المجموع الفرعي" : "Subtotal"}:</span>
                <span>{order.subtotal.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === "ar" ? "الشحن" : "Shipping"}:</span>
                <span>{order.shipping.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === "ar" ? "الضريبة" : "Tax"}:</span>
                <span>{order.tax.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>{language === "ar" ? "الإجمالي" : "Total"}:</span>
                <span className="text-emerald-600">
                  {order.finalTotal.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Order Dates */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "معلومات المواعيد" : "Order Dates"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">{language === "ar" ? "تاريخ الطلب" : "Order Date"}:</p>
                <p className="font-medium">{new Date(order.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === "ar" ? "تاريخ التسليم المتوقع" : "Expected Delivery"}:</p>
                <p className="font-medium">{new Date(order.deliveryDate).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tracking */}
          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "تتبع الشحنة" : "Tracking"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm bg-slate-100 p-2 rounded">
                  {order.trackingNumber}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "إجراءات" : "Actions"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.status === "pending" && (
                <Button className="w-full">
                  {language === "ar" ? "بدء المعالجة" : "Start Processing"}
                </Button>
              )}
              {order.status === "processing" && (
                <Button className="w-full">
                  {language === "ar" ? "تحديث حالة الشحن" : "Update Shipping Status"}
                </Button>
              )}
              {order.status === "shipped" && (
                <Button className="w-full" variant="outline">
                  {language === "ar" ? "تم التسليم" : "Mark as Delivered"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

