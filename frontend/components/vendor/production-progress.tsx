"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/providers/language-provider"
import { Play, Upload, Image, Loader2, X, AlertTriangle } from "lucide-react"

type ProductionStatus = "not_started" | "in_production" | "sample_ready" | "sample_approved" | "quality_check" | "factory_complete"

interface ProductionProgressProps {
  orderId: string
  currentStatus: ProductionStatus
  progress: number
  samplePhotos: string[]
  onStartProduction: () => Promise<void>
  onUpdateProgress: (value: number) => Promise<void>
  onUploadSample: (file: File) => Promise<void>
  /** Reload the current order/sample state (upload-conflict resolution). */
  onReload?: () => Promise<void>
  uploadDisabled?: boolean
  productionAvailable?: boolean
}

const STATUS_LABELS: Record<ProductionStatus, { ar: string; en: string }> = {
  not_started: { ar: "لم تبدأ", en: "Not Started" },
  in_production: { ar: "قيد الإنتاج", en: "In Production" },
  sample_ready: { ar: "العينة جاهزة", en: "Sample Ready" },
  sample_approved: { ar: "تمت الموافقة على العينة", en: "Sample Approved" },
  quality_check: { ar: "فحص الجودة", en: "Quality Check" },
  factory_complete: { ar: "اكتمل إنتاج المصنع", en: "Factory Production Complete" },
}

export function ProductionProgress({
  currentStatus,
  progress,
  samplePhotos,
  onStartProduction,
  onUpdateProgress,
  onUploadSample,
  onReload,
  uploadDisabled = false,
  productionAvailable = true,
}: ProductionProgressProps) {
  const { language } = useLanguage()
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // The person's selected photo, kept locally until the upload commits
  // (the page refetches and the photo arrives via samplePhotos) or the
  // person explicitly removes it. A failed upload must neither present
  // the photo as saved nor silently discard it.
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; previewUrl: string } | null>(null)
  const [uploadError, setUploadError] = useState<"conflict" | "generic" | null>(null)
  const [reloading, setReloading] = useState(false)
  const uploadInFlight = useRef(false)
  const reloadInFlight = useRef(false)
  useEffect(() => () => { if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.previewUrl) }, [pendingPhoto])

  const clearPendingPhoto = () => {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.previewUrl)
    setPendingPhoto(null)
  }

  const attemptUpload = async (file: File) => {
    if (uploadInFlight.current || reloading || uploadDisabled || !["in_production", "sample_ready"].includes(currentStatus) || uploadError === "conflict") return
    uploadInFlight.current = true
    setUploading(true)
    setUploadError(null)
    try {
      await onUploadSample(file)
      clearPendingPhoto()
    } catch (err) {
      // No automatic retry: the photo stays selected and the failure is
      // stated explicitly. A 409 means the sample state changed while
      // the person was working (the backend asks for a reload before
      // retrying); every other failure gets the generic wording.
      setUploadError(
        (err as { status?: unknown } | null)?.status === 409 ? "conflict" : "generic",
      )
    } finally {
      uploadInFlight.current = false
      setUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset the input so re-selecting the same file later fires a fresh
    // change (previously the same file could not even be picked again).
    e.target.value = ""
    if (!file || uploadInFlight.current || reloading || uploadDisabled || uploadError === "conflict") return
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.previewUrl)
    setPendingPhoto({ file, previewUrl: URL.createObjectURL(file) })
    await attemptUpload(file)
  }

  const handleRemovePending = () => {
    clearPendingPhoto()
    setUploadError(null)
  }

  const handleReloadOrder = async () => {
    if (!onReload || reloadInFlight.current || uploadInFlight.current) return
    reloadInFlight.current = true
    setReloading(true)
    try {
      await onReload()
      setUploadError(null)
    } catch {
      // The reload itself failed; keep the conflict message visible.
    } finally {
      reloadInFlight.current = false
      setReloading(false)
    }
  }

  const handleStartProduction = async () => {
    setSubmitting(true)
    try {
      await onStartProduction()
    } finally {
      setSubmitting(false)
    }
  }

  const canStart = productionAvailable && currentStatus === "not_started"
  const canUpdateProgress = productionAvailable && (currentStatus === "in_production" || currentStatus === "sample_ready")
  const canUploadSample = !uploadDisabled && (currentStatus === "in_production" || currentStatus === "sample_ready")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          {language === "ar" ? "تقدم الإنتاج" : "Production Progress"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">
            {language === "ar" ? "الحالة:" : "Status:"}
          </span>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {!productionAvailable ? (language === "ar" ? "بيانات الإنتاج غير متاحة" : "Production data unavailable") : language === "ar"
              ? STATUS_LABELS[currentStatus].ar
              : STATUS_LABELS[currentStatus].en}
          </Badge>
        </div>

        {productionAvailable && ["quality_check", "factory_complete"].includes(currentStatus) && (
          <p role="status" data-factory-release-note className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {language === "ar" ? "هذه حالة إنتاج هذا المصنع فقط، وليست تصريحًا بشحن الطلب. مراجعة الفريق وإجراءات السماح بالشحن لم تكتمل بعد." : "This is this factory's production status only, not permission to ship the order. Team review and shipping release are still pending."}
          </p>
        )}

        {/* Progress Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{language === "ar" ? "نسبة الإنجاز" : "Progress"}</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <Slider
            value={[progress]}
            onValueCommit={([v]) => onUpdateProgress(v)}
            max={100}
            step={5}
            disabled={!canUpdateProgress}
            className="w-full"
          />
        </div>

        {/* Sample Photos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4" />
              {language === "ar" ? "صور العينة" : "Sample Photos"}
            </span>
            {canUploadSample && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading || reloading || uploadError === "conflict"}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="mr-1">
                      {language === "ar" ? "رفع" : "Upload"}
                    </span>
                  </span>
                </Button>
              </label>
            )}
          </div>
          {samplePhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {samplePhotos.map((url, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border bg-slate-50">
                  <img src={url} alt={`Sample photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {language === "ar" ? "لم يتم رفع صور عينة بعد" : "No sample photos uploaded yet"}
            </p>
          )}

          {pendingPhoto && !canUploadSample && <p role="status">{language === "ar" ? "الرفع غير متاح في الحالة الحالية. الصورة المحددة محفوظة محليًا." : "Upload is unavailable in the current state. Your selected photo is kept locally."}</p>}
          {pendingPhoto && (
            <div
              data-pending-photo
              className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 space-y-2"
            >
              <div className="flex items-center gap-3">
                <img
                  src={pendingPhoto.previewUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded object-cover border bg-white"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pendingPhoto.file.name}</p>
                  <p className="text-xs text-slate-500">
                    {language === "ar" ? "لم تُرفع بعد" : "Not uploaded yet"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRemovePending}
                  disabled={uploading || reloading}
                  aria-label={language === "ar" ? "حذف الصورة" : "Remove photo"}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => attemptUpload(pendingPhoto.file)}
                disabled={uploading || reloading || !canUploadSample || uploadError === "conflict"}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span className="ml-1">
                  {language === "ar" ? "رفع هذه الصورة" : "Upload this photo"}
                </span>
              </Button>
            </div>
          )}

          {uploadError && (
            <div
              role="alert"
              className={
                uploadError === "conflict"
                  ? "rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2"
                  : "rounded-md border border-rose-200 bg-rose-50 p-3 space-y-2"
              }
            >
              <p
                className={
                  uploadError === "conflict"
                    ? "flex items-center gap-2 text-sm font-medium text-amber-800"
                    : "flex items-center gap-2 text-sm font-medium text-rose-800"
                }
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {uploadError === "conflict"
                  ? language === "ar"
                    ? "تغيّرت حالة العينة أثناء عملك"
                    : "Sample changed while you were working"
                  : language === "ar"
                    ? "فشل الرفع"
                    : "Upload failed"}
              </p>
              <p
                className={
                  uploadError === "conflict" ? "text-xs text-amber-700" : "text-xs text-rose-700"
                }
              >
                {uploadError === "conflict"
                  ? language === "ar"
                    ? "ربما استُبدلت العينة أو تمت مراجعتها أو تغيّرت حالة الإنتاج. لم يُقبل هذا الإرسال. الصورة ما زالت محددة. حدّث بيانات الطلب قبل اتخاذ قرار بإعادة الرفع."
                    : "The sample may have been replaced or reviewed, or production may have changed. This submission was not accepted. Your photo is still selected. Reload the current order before deciding whether to upload again."
                  : language === "ar"
                    ? "تعذر تأكيد الرفع. الصورة ما زالت محددة. يمكنك إعادة المحاولة أو حذفها."
                    : "The upload could not be confirmed. Your photo is still selected. You can retry or remove it."}
              </p>
              {uploadError === "conflict" && onReload && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleReloadOrder}
                  disabled={reloading}
                >
                  {reloading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                  {language === "ar" ? "تحديث بيانات الطلب" : "Reload order"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {canStart && (
            <Button className="w-full" onClick={handleStartProduction} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {language === "ar" ? "بدء الإنتاج" : "Start Production"}
            </Button>
          )}

        </div>
      </CardContent>
    </Card>
  )
}
