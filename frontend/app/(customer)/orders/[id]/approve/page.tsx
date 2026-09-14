"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, FileText, ExternalLink, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { approvalsApi } from "@/lib/api/approvals"
import { ApiClientError } from "@/lib/api/client"
import { currencyOf, orderTotal } from "@/lib/orders/projections"
import type { DesignFile, Order } from "@shared/types"

type PageState =
  | "idle"
  | "loading"
  | "order-error"
  | "done" // order already moved past awaiting_approval
  | "ready"
  | "success"
  | "changes-sent"

function byType(files: DesignFile[] | undefined, type: string): DesignFile | undefined {
  return files?.find((f) => f.fileType === type)
}

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
  const [changeReason, setChangeReason] = useState("")
  const [busy, setBusy] = useState<"approve" | "changes" | null>(null)

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
          setState(res.data.status === "awaiting_approval" ? "ready" : "done")
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

  const preview = useMemo(() => byType(order?.design?.files, "preview"), [order])
  const proofFile = useMemo(() => byType(order?.design?.files, "proof"), [order])
  const firstItem = order?.items?.[0]

  const handleApprove = async () => {
    if (state !== "ready") return
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

  const handleRequestChanges = async () => {
    if (state !== "ready") return
    setActionError("")
    if (changeReason.trim().length < 10) {
      setActionError(
        language === "ar"
          ? "يرجى وصف التعديلات المطلوبة بتفصيل كافٍ"
          : "Please describe the requested changes in enough detail",
      )
      return
    }
    setBusy("changes")
    try {
      await approvalsApi.requestChanges(orderId)
      setState("changes-sent")
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
                  "Either it was already approved, or it has not reached the approval step yet.",
                  "إما تمت الموافقة عليه مسبقاً أو لم يصل إلى خطوة الموافقة بعد.",
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

  if (state === "changes-sent") {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <RotateCcw className="h-16 w-16 text-amber-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t("Changes Requested", "تم طلب التعديلات")}</h1>
        <p className="text-slate-600 mb-6">
          {order ? (
            <>
              {t("Requested changes for order", "تم إرسال طلب التعديلات للطلب")}{" "}
              <span className="font-semibold">{order.orderNumber}</span>{" "}
              {t(
                "have been sent back to the vendor for revision.",
                "ويعاد الآن إلى المورّد للمراجعة.",
              )}
            </>
          ) : null}
        </p>
        {order && (
          <Link href={`/orders/${order.id}`}>
            <Button variant="outline">{t("View Order", "عرض الطلب")}</Button>
          </Link>
        )}
      </div>
    )
  }

  // state === "ready" — show the proof + approve/request-changes actions
  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
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
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.fileUrl}
                alt={preview.fileName || "Design preview"}
                className="w-full rounded-lg border border-slate-200 bg-white object-contain"
                style={{ maxHeight: 340 }}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 h-48 flex items-center justify-center">
                <FileText className="h-8 w-8 text-slate-300" />
                <p className="ml-2 text-sm text-slate-400">{t("No preview available", "لا توجد معاينة متاحة")}</p>
              </div>
            )}

            {proofFile && (
              <a
                href={proofFile.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                <FileText className="h-4 w-4" />
                {t("Download PDF proof", "تحميل نموذج PDF")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {!proofFile && (
              <p className="mt-4 text-xs text-slate-400">
                {t(
                  "A print-ready proof PDF will be attached when the vendor sends the artwork.",
                  "سيتم إرفاق نموذج PDF جاهز للطباعة عند إرسال المورّد للتصميم النهائي.",
                )}
              </p>
            )}
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
                disabled={busy !== null}
              >
                {busy === "approve" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("Approve Design", "اعتماد التصميم")}
              </Button>

              <div className="border-t border-slate-100 pt-4 space-y-2">
                <Label htmlFor="change-reason" className="text-sm font-medium">
                  {t("Request changes (optional)", "طلب تعديلات (اختياري)")}
                </Label>
                <textarea
                  id="change-reason"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder={t(
                    "Describe what should be changed to match your requirement...",
                    "صف التعديلات المطلوبة لتطابق متطلباتك...",
                  )}
                  className="w-full min-h-[90px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button variant="outline" className="w-full" onClick={handleRequestChanges} disabled={busy !== null}>
                  {busy === "changes" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("Send back for revision", "إرسال للمراجعة")}
                </Button>
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