"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/providers/language-provider"
import { Play, CheckCircle2, Upload, Image, Loader2 } from "lucide-react"

type ProductionStatus = "not_started" | "in_production" | "sample_ready" | "sample_approved" | "quality_check" | "ready_to_ship"

interface ProductionProgressProps {
  orderId: string
  currentStatus: ProductionStatus
  progress: number
  samplePhotos: string[]
  onStartProduction: () => Promise<void>
  onUpdateProgress: (value: number) => Promise<void>
  onUploadSample: (file: File) => Promise<void>
  onMarkReadyToShip: () => Promise<void>
}

const STATUS_LABELS: Record<ProductionStatus, { ar: string; en: string }> = {
  not_started: { ar: "لم تبدأ", en: "Not Started" },
  in_production: { ar: "قيد الإنتاج", en: "In Production" },
  sample_ready: { ar: "العينة جاهزة", en: "Sample Ready" },
  sample_approved: { ar: "تمت الموافقة على العينة", en: "Sample Approved" },
  quality_check: { ar: "فحص الجودة", en: "Quality Check" },
  ready_to_ship: { ar: "جاهز للشحن", en: "Ready to Ship" },
}

export function ProductionProgress({
  currentStatus,
  progress,
  samplePhotos,
  onStartProduction,
  onUpdateProgress,
  onUploadSample,
  onMarkReadyToShip,
}: ProductionProgressProps) {
  const { language } = useLanguage()
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUploadSample(file)
    } finally {
      setUploading(false)
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

  const handleMarkReady = async () => {
    setSubmitting(true)
    try {
      await onMarkReadyToShip()
    } finally {
      setSubmitting(false)
    }
  }

  const canStart = currentStatus === "not_started"
  const canUpdateProgress = currentStatus === "in_production" || currentStatus === "sample_ready"
  const canUploadSample = currentStatus === "in_production" || currentStatus === "sample_ready"
  const canMarkReady = currentStatus === "quality_check"

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
            {language === "ar"
              ? STATUS_LABELS[currentStatus].ar
              : STATUS_LABELS[currentStatus].en}
          </Badge>
        </div>

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
                  disabled={uploading}
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
          {canMarkReady && (
            <Button className="w-full" onClick={handleMarkReady} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {language === "ar" ? "تحديد كجاهز للشحن" : "Mark Ready to Ship"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
