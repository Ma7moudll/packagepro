"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, FileText, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { approvalProofUrl } from "@/lib/orders/approval-proof"
import { approvalsApi } from "@/lib/api/approvals"
import { ApiClientError } from "@/lib/api/client"
import { currencyOf, orderTotal } from "@/lib/orders/projections"
import type { Order } from "@shared/types"

type PageState =
  | "idle"
  | "loading"
  | "order-error"
  | "done" // order already moved past awaiting_approval
  | "ready"
  | "success"

export default function OrderApprovePage() {
  const { language } = useLanguage()
  const { user, isLoading: authLoading } = useAuth()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = (params.id as string) || ""

  const token = searchParams.get("token") || ""

  const [state, setState] = useState<PageState>("idle")
  const [order, setOrder] = useState<Order | null>(null)
  const [pageError, setPageError] = useState("")
  const [actionError, setActionError] = useState("")
  const [legalAccepted, setLegalAccepted] = useState(false)
  const [busy, setBusy] = useState<"approve" | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const callbackUrl = encodeURIComponent(window.location.pathname + window.location.search)
      router.replace(`/login?callbackUrl=${callbackUrl}`)
      return
    }
    setState("loading")
    approvalsApi
      .getById(orderId)
      .then((res) => {
        if (res.success && res.data) {
          setOrder(res.data)
          setState(res.data.status === "awaiting_approval" && res.data.currentApprovalRequest?.status === "pending" && res.data.currentApprovalRequest.current && !!res.data.currentApprovalRequest.proofUrl ? "ready" : "done")
        }
      })
      .catch((error) => {
        if (error instanceof ApiClientError && error.status === 404) {
          setPageError(
            language === "ar"
              ? "الطلب غير موجود أو ليس لديك صلاحية الوصول"
              : "Order not found or you do not have access to it",
          )
        } else {
          setPageError(
            language === "ar"
              ? "تعذر تحميل الطلب. حاول مرة أخرى"
              : "Could not load the order. Please try again.",
          )
        }
        setState("order-error")
      })
  }, [authLoading, user, orderId, language, router])

  // Historical preview files are not the approved proof. Show only the bound PDF.
  const proofFile = useMemo(() => {
    const value=order?.currentApprovalRequest?.proofUrl
    const url=value ? approvalProofUrl(value, process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api", typeof window !== "undefined" ? window.location.origin : undefined) : null
    return url ? {fileUrl:url} : undefined
  }, [order])
  const firstItem = order?.items?.[0]

  const handleApprove = async () => {
    if (state !== "ready" || !proofFile) return
    setActionError("")
    if (!legalAccepted) {
      setActionError(
        language === "ar"
          ? "يرجى تأكيد البيانات قبل الموافقة على التصميم"
          : "Please confirm the details before approving the design",
      )
      return
    }
    setBusy("approve")
    try {
      await approvalsApi.approve(orderId, token)
      setState("success")
    } catch (error) {
      setActionError(mapApprovalError(error, language))
    } finally {
      setBusy(null)
    }
  }

  const t = (en: string, ar: string) => (language === "ar" ? ar : en)

  if (state === "idle" || state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (state === "order-error") {
    return (
      <div className="max-w-lg mx-auto p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("Unable to load order", "تعذر تحميل الطلب")}</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
        <div className="mt-6 flex justify-center">
          <Link href="/orders">
            <Button variant="outline">{t("Back to Orders", "العودة إلى الطلبات")}</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (state === "done") {
    return (
      <div className="max-w-lg mx-auto p-8">
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("Nothing to approve", "لا يوجد ما يتطلب الموافقة")}</AlertTitle>
          <AlertDescription>
            {order ? (
              <>
                {t("This order is currently", "هذا الطلب حالياً بحالة")}{" "}
                <Badge variant="outline">{(order.status ?? "unknown").replace(/_/g, " ")}</Badge>.{" "}
                {t(
                  "There is no current proof ready to approve. The design may have changed. Ask for a new review.",
                  "لا يوجد ملف مراجعة حالي جاهز للموافقة. ربما تغير التصميم. اطلب مراجعة جديدة.",
                )}
              </>
            ) : null}
          </AlertDescription>
        </Alert>
        {order && (
          <div className="mt-6 flex justify-center gap-4">
            <Link href={`/orders/${order.id}`}>
              <Button variant="outline">{t("View Order", "عرض الطلب")}</Button>
            </Link>
          </div>
        )}
      </div>
    )
  }

  if (state === "success") {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t("Design Approved", "تمت الموافقة على التصميم")}</h1>
        <p className="text-slate-600 mb-6">
          {order ? (
            <>
              {t("Order", "الطلب")} <span className="font-semibold">{order.orderNumber}</span>{" "}
              {t(
                "has been approved and is now moving to production routing.",
                "تمت الموافقة عليه وسيتم الآن نقله إلى مرحلة التوجيه للإنتاج.",
              )}
            </>
          ) : null}
        </p>
        {order && (
          <Link href={`/orders/${order.id}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">{t("View Order", "عرض الطلب")}</Button>
          </Link>
        )}
      </div>
    )
  }

  // state === "ready" — show the proof + approve/request-changes actions
  return (
    <div className="max-w-5xl min-w-0 mx-auto p-4 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between mb-8">
        <div>
          <Badge className="mb-2 bg-emerald-100 text-emerald-800">
            {t("Design Proof Approval", "الموافقة على التصميم")}
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {t("Review Your Design Proof", "راجع نموذج التصميم الخاص بك")}
          </h1>
          <p className="text-slate-500 mt-1">
            {t("Order", "الطلب")}: {order?.orderNumber}
          </p>
        </div>
        {order && <Badge>{(order.status ?? "").replace(/_/g, " ")}</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Proof visual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("Design Preview", "معاينة التصميم")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">{t("Open the exact proof PDF below. Historical preview images are not approval evidence.", "افتح ملف المراجعة المحدد أدناه. صور المعاينة القديمة ليست مرجعا للموافقة.")}</p>
            {!proofFile && <Alert variant="destructive"><AlertDescription>{t("The current proof cannot be opened. Approval is blocked. Ask for a new review link.", "تعذر فتح ملف المراجعة الحالي. الموافقة متوقفة. اطلب رابط مراجعة جديد.")}</AlertDescription></Alert>}
            {proofFile && <a data-testid="current-approval-proof" href={proofFile.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex max-w-full min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50">
              <ExternalLink className="h-4 w-4" />{t("Open this request's proof PDF", "افتح ملف المراجعة لهذا الطلب")}
            </a>}
            <p className="mt-3 break-all text-xs text-slate-500">{t("Review request", "طلب المراجعة")}: {order?.currentApprovalRequest?.id}</p>
          </CardContent>
        </Card>

        {/* Specs + actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Order Summary", "ملخص الطلب")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">{t("Product", "المنتج")}</span>
                <span className="font-medium capitalize">{firstItem?.productType ?? "—"}</span>
              </div>
              {firstItem?.dimensions && (
                <div className="flex justify-between">
                  <span className="text-slate-600">{t("Dimensions", "الأبعاد")}</span>
                  <span className="font-medium">
                    {firstItem.dimensions.length}×{firstItem.dimensions.width}
                    {firstItem.dimensions.height ? `×${firstItem.dimensions.height}` : ""}
                    {firstItem.dimensions.unit || "mm"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">{t("Quantity", "الكمية")}</span>
                <span className="font-medium">{firstItem?.quantity ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("Material", "الخامة")}</span>
                <span className="font-medium capitalize">
                  {firstItem?.materialCode || firstItem?.material || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("Total", "الإجمالي")}</span>
                <span className="font-bold">
                  {order ? orderTotal(order).toFixed(2) : "0.00"} {order ? currencyOf(order) : ""}
                </span>
              </div>
            </CardContent>
          </Card>

          {actionError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("Action failed", "فشل تنفيذ الإجراء")}</AlertTitle>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Approve or Request Changes", "وافق أو اطلب تعديلات")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={legalAccepted}
                  onCheckedChange={(v) => setLegalAccepted(v === true)}
                  aria-label={t("Confirm design details", "تأكيد تفاصيل التصميم")}
                />
                <span className="text-sm text-slate-600 leading-relaxed">
                  {t(
                    "I confirm the artwork, dimensions, materials and quantity match my requirements, and I approve this design for production.",
                    "أؤكد أن التصميم والأبعاد والخامات والكمية مطابقة لمتطلباتي، وأوافق على اعتماد هذا التصميم للإنتاج.",
                  )}
                </span>
              </label>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={handleApprove}
                disabled={!proofFile || busy !== null}
              >
                {busy === "approve" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("Approve Design", "اعتماد التصميم")}
              </Button>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-sm text-amber-800">{t("Do not approve if changes are needed. Ask the order administrator to reopen for fresh review. Only an admin can reopen, and only before any purchase order.", "لا توافق إذا احتجت تعديلات. اطلب من مسؤول الطلب إرجاعه لمراجعة جديدة. الرجوع للأدمن فقط وقبل إنشاء أي أمر تصنيع.")}</p>
                <Link href={`/orders/${orderId}`} className="inline-flex min-h-11 items-center underline text-sm">{t("View order details", "عرض تفاصيل الطلب")}</Link>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href={`/orders/${orderId}`} className="text-sm text-slate-500 hover:text-slate-700">
              {t("Back to order details", "العودة إلى تفاصيل الطلب")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function mapApprovalError(error: unknown, language: string): string {
  if (error instanceof ApiClientError) {
    const msg = error.message || ""
    if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
      return language === "ar"
        ? "رابط الموافقة غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد."
        : "This approval link is invalid or has expired. Please request a new one."
    }
    if (msg.toLowerCase().includes("not awaiting")) {
      return language === "ar"
        ? "تمت معالجة هذا التصميم مسبقاً."
        : "This design has already been processed."
    }
    return msg
  }
  return language === "ar"
    ? "حدث خطأ غير متوقع. حاول مرة أخرى."
    : "An unexpected error occurred. Please try again."
}