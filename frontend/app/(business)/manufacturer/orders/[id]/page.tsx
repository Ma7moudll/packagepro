"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { ordersApi } from "@/lib/api/orders"
import { vendorsApi, num, type BackendOrder, type PurchaseOrder } from "@/lib/api/vendors"
import { HandshakeActions } from "@/components/vendor/handshake-actions"
import { ProductionProgress } from "@/components/vendor/production-progress"
import { OrderTimeline } from "@/components/orders/order-timeline"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, MapPin, Phone, Mail, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import type { OrderStatus } from "@shared/types"

type ProductionUiStatus = "not_started" | "in_production" | "sample_ready" | "sample_approved" | "quality_check" | "ready_to_ship"

const PRODUCTION_MAP: Record<string, ProductionUiStatus> = {
  not_started: "not_started",
  in_progress: "in_production",
  sample_production: "sample_ready",
  quality_review: "quality_check",
  completed: "ready_to_ship",
}

export default function ManufacturerOrderDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()

  const orderId = Array.isArray(params.id) ? params.id[0] : params.id
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<BackendOrder | null>(null)
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [productionStatus, setProductionStatus] = useState<ProductionUiStatus>("not_started")
  const [productionProgress, setProductionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadSeq = useRef(0)
  const [productionSeen, setProductionSeen] = useState(false)
  const [uploadRefreshError, setUploadRefreshError] = useState(false)

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    const seq = ++loadSeq.current
    try {
      if (!opts?.silent) setLoading(true)
      const [orderRes, vendorData] = await Promise.all([
        ordersApi.getById(orderId!),
        vendorsApi.getOrders().catch(err => {
          if (opts?.silent) throw err
          return { success: false, data: [] as PurchaseOrder[] }
        }),
      ])
      if (seq !== loadSeq.current) throw new Error("Reload superseded")
      if (!orderRes.success || !orderRes.data || (opts?.silent && !vendorData.success))
        throw new Error("Order could not refresh")
      setError(null)
      setOrder(orderRes.data as unknown as BackendOrder)
      const rows = vendorData.data as unknown as PurchaseOrder[]
      const matched = rows.find((r) => r.orderId === orderId)
      setPo(matched || null)
      if (matched?.production || matched?.handshake?.status === "accepted") setProductionSeen(true)
      setProductionStatus(matched?.production ? PRODUCTION_MAP[matched.production.status] || "not_started" : "not_started")
      setProductionProgress(matched?.production?.progressPercent || 0)
    } catch (err) {
      if (seq === loadSeq.current) {
        setError(language === "ar" ? "تعذر تحديث الطلب. الحالة المعروضة قديمة." : "Order could not refresh. The displayed state may be stale.")
        if (!opts?.silent) setOrder(null)
      }
      if (opts?.silent) throw err
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [orderId, language])

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }
    if (orderId) {
      fetchData()
    }
    return () => { loadSeq.current++ }
  }, [user, router, orderId, fetchData])

  const handleAcceptHandshake = async () => {
    if (!po?.handshake) return
    await vendorsApi.acceptHandshake(po.handshake.id)
    await fetchData()
  }

  const handleRejectHandshake = async (reason?: string) => {
    if (!po?.handshake) return
    await vendorsApi.rejectHandshake(po.handshake.id, reason)
    await fetchData()
  }

  const handleStartProduction = async () => {
    if (!po) return
    const res = await vendorsApi.startProduction(po.id)
    if (res.success && res.data) {
      setProductionStatus(PRODUCTION_MAP[res.data.status] || "in_production")
      setProductionProgress(res.data.progressPercent || 0)
      await fetchData()
    }
  }

  const handleUpdateProgress = async (value: number) => {
    setProductionProgress(value)
    setProductionStatus((s) => (s === "not_started" ? "in_production" : s))
    if (po?.production?.id) {
      try {
        await vendorsApi.updateProductionProgress(po.production.id, value)
      } catch (err) {
        console.error("Error updating production progress:", err)
      }
    }
  }

  const handleUploadSample = async (file: File) => {
    if (!po?.production?.id) throw new Error("Production unavailable")
    setUploadRefreshError(false)
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.slice(result.indexOf(",") + 1))
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
    const res = await vendorsApi.uploadSamples(po.production.id, [
      { fileName: file.name, mimeType: file.type || "image/jpeg", dataBase64 },
    ])
    if (!res.success) throw new Error("Upload failed")
    try { await fetchData({ silent: true }) } catch { setUploadRefreshError(true) }
  }

  const handleMarkReadyToShip = async () => {
    setProductionStatus("ready_to_ship")
    if (orderId) {
      await ordersApi.updateStatus(orderId, "ready_to_ship")
      await fetchData()
    }
  }

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

  if (error && !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/manufacturer/orders">
            {language === "ar" ? "العودة للطلبات" : "Back to Orders"}
          </Link>
        </Button>
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

  const orderStatus = (order.status || "pending_review") as OrderStatus

  const statusVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending_review: "secondary",
      awaiting_approval: "secondary",
      ready_for_routing: "outline",
      vendor_confirmed: "default",
      in_production: "default",
      quality_check: "outline",
      ready_to_ship: "default",
      shipped: "outline",
      delivered: "default",
      completed: "default",
      cancelled: "destructive",
    }
    return map[status] || "secondary"
  }

  const statusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, { ar: string; en: string }> = {
      pending_review: { ar: "قيد المراجعة", en: "Pending Review" },
      awaiting_approval: { ar: "بانتظار الموافقة", en: "Awaiting Approval" },
      ready_for_routing: { ar: "جاهز للتوجيه", en: "Ready for Routing" },
      vendor_confirmed: { ar: "تم تأكيد المورد", en: "Vendor Confirmed" },
      in_production: { ar: "قيد الإنتاج", en: "In Production" },
      quality_check: { ar: "فحص الجودة", en: "Quality Check" },
      ready_to_ship: { ar: "جاهز للشحن", en: "Ready to Ship" },
      shipped: { ar: "تم الشحن", en: "Shipped" },
      delivered: { ar: "تم التسليم", en: "Delivered" },
      completed: { ar: "مكتمل", en: "Completed" },
      cancelled: { ar: "ملغي", en: "Cancelled" },
    }
    return language === "ar" ? labels[status].ar : labels[status].en
  }

  const isHandshakable = po?.handshake?.status === "pending"
  const shipAddr: NonNullable<BackendOrder["shippingAddress"]> = order.shippingAddress || {
    name: order.shippingName,
    phone: order.shippingPhone,
    email: order.shippingEmail ?? undefined,
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {language === "ar" ? "تفاصيل الطلب" : "Order Details"}
              </h1>
              {po?.poNumber && (
                <Badge variant="outline" className="text-xs font-mono">
                  {po.poNumber}
                </Badge>
              )}
            </div>
            <p className="text-slate-600">#{order.orderNumber || order.id}</p>
          </div>
        </div>
        <Badge variant={statusVariant(orderStatus)} className="text-sm px-3 py-1">
          {statusLabel(orderStatus)}
        </Badge>
      </div>

      {/* Order Timeline */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <OrderTimeline status={orderStatus} />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "تفاصيل الطلب" : "Order Items"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items && order.items.length > 0 ? (
                order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.productType}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {language === "ar" ? "الكمية" : "Quantity"}: {item.quantity.toLocaleString()}
                      </p>
                      {item.dimensions && (
                        <p className="text-sm text-slate-600">
                          {item.dimensions.length} × {item.dimensions.width}
                          {item.dimensions.height ? ` × ${item.dimensions.height}` : ""}{" "}
                          {item.dimensions.unit}
                        </p>
                      )}
                      <p className="text-sm text-slate-600">
                        {language === "ar" ? "سعر الوحدة" : "Unit Price"}: {num(item.unitPrice).toFixed(2)} {language === "ar" ? "جنيه" : "EGP"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600">
                        {num(item.totalPrice).toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">
                  {language === "ar" ? "لا توجد عناصر" : "No items"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "معلومات العميل" : "Customer Information"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-sm">{order.customer?.user?.email || order.shippingEmail || shipAddr?.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-sm">{order.shippingPhone || shipAddr?.phone || "—"}</span>
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
              {shipAddr ? (
                <div className="text-slate-700 space-y-1">
                  <p>{shipAddr.name || order.shippingName}</p>
                  {shipAddr.street ? <p>{shipAddr.street}</p> : null}
                  {shipAddr.city ? (
                    <p>{shipAddr.city}{shipAddr.state ? `, ${shipAddr.state}` : ""} {shipAddr.postalCode || ""}</p>
                  ) : null}
                  {shipAddr.country ? <p>{shipAddr.country}</p> : null}
                </div>
              ) : (
                <p className="text-slate-400">{language === "ar" ? "غير متوفر" : "Not available"}</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "ملاحظات" : "Notes"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Handshake Actions */}
          <HandshakeActions
            handshakeExpiresAt={po?.handshake?.expiresAt || new Date(Date.now() + 14400000).toISOString()}
            onAccept={handleAcceptHandshake}
            onReject={handleRejectHandshake}
            isHandshakable={isHandshakable}
          />

          {/* Production Progress */}
          {productionSeen && (
            <>
              {po?.production?.samples?.[0]?.status === "rejected" && po?.production?.samples?.[0]?.revisionNotes && (
                <Alert className="border-rose-200 bg-rose-50 text-rose-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">
                      {language === "ar" ? "تعديلات مطلوبة على العينة: " : "Sample revisions requested: "}
                    </span>
                    {po.production.samples[0].revisionNotes}
                  </AlertDescription>
                </Alert>
              )}
              {error && <p role="alert">{error}</p>}
              {uploadRefreshError && <p role="status">{language === "ar" ? "تم رفع الصورة، لكن تعذر تحديث بيانات الطلب." : "Photo uploaded, but order data could not be refreshed."}</p>}
              <ProductionProgress
                key={order.id}
                orderId={order.id}
                productionAvailable={!!po}
                uploadDisabled={!po?.production?.id || ["cancelled", "shipped", "delivered", "completed"].includes(order.status)}
                currentStatus={productionStatus}
                progress={productionProgress}
                samplePhotos={po?.production?.samples?.[0]?.photoUrls ?? []}
                onStartProduction={handleStartProduction}
                onUpdateProgress={handleUpdateProgress}
                onUploadSample={handleUploadSample}
                onMarkReadyToShip={handleMarkReadyToShip}
                onReload={() => fetchData({ silent: true })}
              />
            </>
          )}

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "ملخص الطلب" : "Order Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>{language === "ar" ? "المجموع الفرعي" : "Subtotal"}:</span>
                <span>{num(order.subtotal).toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === "ar" ? "الشحن" : "Shipping"}:</span>
                <span>{num(order.shippingCost).toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === "ar" ? "الضريبة" : "Tax"}:</span>
                <span>{num(order.tax).toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>{language === "ar" ? "الإجمالي" : "Total"}:</span>
                <span className="text-emerald-600">
                  {num(order.total).toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
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
                <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === "ar" ? "آخر تحديث" : "Last Updated"}:</p>
                <p className="font-medium">{new Date(order.updatedAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}