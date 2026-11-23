"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, FileText, Palette } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { designsApi, type DesignRecord } from "@/lib/api/designs"
import { ArtworkReviewDownload } from "@/components/editor/export/ArtworkReviewDownload"

const FILE_LABELS: Record<string, { en: string; ar: string }> = {
  artwork_review: { en: "RGB artwork review, not for production", ar: "مراجعة تصميم RGB، غير مخصصة للإنتاج" },
  preview: { en: "Preview", ar: "معاينة" },
  print_file: { en: "Print file", ar: "ملف الطباعة" },
  proof: { en: "Proof", ar: "نموذج" },
  dieline: { en: "Dieline", ar: "خط القص" },
  logo: { en: "Logo", ar: "شعار" },
  export: { en: "Export", ar: "تصدير" },
}

export default function DesignDetailPage() {
  const { language } = useLanguage()
  const params = useParams()
  const designId = (params.id as string) || ""

  const [design, setDesign] = useState<DesignRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const t = (en: string, ar: string) => (language === "ar" ? ar : en)

  useEffect(() => {
    loadDesign()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designId])

  const loadDesign = async () => {
    setLoading(true)
    try {
      const res = await designsApi.getById(designId)
      if (res.success && res.data) {
        setDesign(res.data)
      }
    } catch (error) {
      console.error("Error loading design:", error)
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

  if (!design) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-500 mb-4">{t("Design not found", "التصميم غير موجود")}</p>
          <Link href="/designs">
            <Button variant="outline">{t("Back to Designs", "العودة إلى التصاميم")}</Button>
          </Link>
        </div>
      </div>
    )
  }

  const preview = design.files?.find((f) => f.fileType === "preview")
  const status = (design.lifecycleStatus || design.status || "draft").toLowerCase()
  const config = design.designConfig as
    | { materialCode?: string; printCoverage?: string; finish?: string; sku?: string }
    | null
    | undefined

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            {design.name || design.sessionId || t("Untitled design", "تصميم بدون اسم")}
          </h1>
          <p className="text-slate-500">
            {design.updatedAt
              ? t("Updated", "آخر تحديث") +
                " " +
                new Date(design.updatedAt).toLocaleDateString()
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge>{status.replace(/_/g, " ")}</Badge>
          <Link href="/designs">
            <Button variant="outline">{t("Back", "رجوع")}</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("Design Preview", "معاينة التصميم")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center rounded-lg border border-slate-200 bg-white min-h-[280px] overflow-hidden">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.fileUrl}
                alt={design.name || "Design preview"}
                className="w-full h-auto max-h-96 object-contain"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-300">
                <Palette className="h-12 w-12 mb-2" />
                <p className="text-sm">{t("No preview available", "لا توجد معاينة متاحة")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Specifications", "المواصفات")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">{t("SKU", "رمز المنتج")}</span>
                <span className="font-mono">{design.sku || config?.sku || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("Material", "الخامة")}</span>
                <span className="capitalize">{config?.materialCode || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("Print coverage", "نسبة الطباعة")}</span>
                <span className="capitalize">{config?.printCoverage || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{t("Finish", "التشطيب")}</span>
                <span className="capitalize">{config?.finish || "—"}</span>
              </div>
              {design.order && (
                <div className="flex justify-between border-t border-slate-100 pt-3">
                  <span className="text-slate-600">{t("Linked order", "الطلب المرتبط")}</span>
                  <Link href={`/orders/${design.order.id}`} className="text-emerald-700 hover:text-emerald-800">
                    {design.order.orderNumber}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("Files", "الملفات")}</CardTitle>
            </CardHeader>
            <CardContent>
              {design.files && design.files.length > 0 ? (
                <ul className="space-y-2">
                  {design.files.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <FileText className="h-4 w-4 text-slate-400" />
                        {FILE_LABELS[f.fileType]?.[language === "ar" ? "ar" : "en"] || f.fileType}
                      </span>
                      {f.fileType === "artwork_review" ? <ArtworkReviewDownload designId={designId} fileId={f.id} /> : <a
                        href={f.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"
                      >
                        {t("Open", "فتح")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">{t("No files attached", "لا توجد ملفات مرفقة")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}