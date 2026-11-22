"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { isTexturesPending, subscribeTexturesPending } from "@/lib/editor/services/texture-status"
import { sanitizeEditorSvg } from "@/lib/editor/sanitize-svg"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Download, Loader2, BadgeCheck, ShieldAlert, RefreshCw } from "lucide-react"
import { exportDesign, ExportOptions } from "@/lib/editor/services/export"
import { useLanguage } from "@/providers/language-provider"
import { generateAI, generateEPS, downloadBlob } from "@/lib/editor/services/vector-export"
import { CertifiedExportProvider, useCertifiedExport } from "./certified-export-context"
import { ArtworkReviewDownload } from "./ArtworkReviewDownload"

export function ExportDialog() {
  return (
    <CertifiedExportProvider>
      <ExportDialogInner />
    </CertifiedExportProvider>
  )
}

function ExportDialogInner() {
  const texturesPending = useSyncExternalStore(subscribeTexturesPending, isTexturesPending, () => false)
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const certified = useCertifiedExport()
  const [options, setOptions] = useState<Partial<ExportOptions>>({
    format: "pdf",
    resolution: 300,
    colorMode: "rgb",
    includeBleed: true,
    bleedSize: 3,
    includeCropMarks: true,
    includeDieLines: false,
    flattenLayers: true,
  })

  useEffect(() => {
    if (open && certified.status === "idle") {
      certified.refresh()
    }
  }, [open, certified])

  const t = (en: string, ar: string) => (language === "ar" ? ar : en)

  const handleExport = async () => {
    setExporting(true)
    try {
      const fmt = options.format || "pdf"
      if (fmt === "ai" || fmt === "eps") {
        const canvasEl = document.querySelector("canvas")
        if (canvasEl) {
          const fabricCanvas = (window as any).__fabricCanvas || null
          if (fabricCanvas) {
            const svg = sanitizeEditorSvg(fabricCanvas.toSVG())
            const w = fabricCanvas.getWidth()
            const h = fabricCanvas.getHeight()
            if (fmt === "ai") {
              const content = generateAI(svg, w, h)
              downloadBlob(content, `design-${Date.now()}.ai`, "application/postscript")
            } else {
              const content = generateEPS(svg, w, h)
              downloadBlob(content, `design-${Date.now()}.eps`, "application/postscript")
            }
            setOpen(false)
            return
          }
        }
      }
      const blob = await exportDesign(options)
      if (!blob) {
        alert(language === "ar" ? "هذا التنسيق غير متاح بعد" : "This export format is not available yet")
        return
      }
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `design-${Date.now()}.${fmt}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setOpen(false)
      }
    } catch (error) {
      console.error("Export failed:", error)
      alert(language === "ar" ? "فشل التصدير" : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {language === "ar" ? "تصدير" : "Export"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{language === "ar" ? "تصدير التصميم" : "Export Design"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-3"><ArtworkReviewDownload /></div>
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">
                  {t("Certified Dieline", "مخطط القص المُعتمد")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => certified.refresh()}
                disabled={certified.status === "loading"}
                title={t("Re-check", "إعادة الفحص")}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                "Vector die-cut outline (mm) delivered only under an active prepress certification.",
                "مخطط القص المتجهي (مم) يُسلَّم فقط بموجب شهادة ما قبل الطباعة النشطة."
              )}
            </p>
            {certified.status === "loading" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Checking certification…", "جارٍ التحقق من الشهادة…")}
              </div>
            ) : certified.delivery?.status === "delivered" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => certified.downloadCertified()}
              >
                <Download className="h-4 w-4 mr-2" />
                {t("Download", "تنزيل")} {certified.delivery.fileName}
              </Button>
            ) : (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{t("Not certified", "غير مُعتمد")}</p>
                  <p>
                    {certified.delivery?.status === "blocked_certification"
                      ? certified.delivery.certification.reason
                      : certified.delivery?.status === "unavailable"
                        ? certified.delivery.reason
                        : t(
                            "Run the prepress check to certify this delivery.",
                            "قم بتشغيل فحص ما قبل الطباعة لاعتماد هذا التسليم."
                          )}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>{t("Format", "التنسيق")}</Label>
            <Select
              value={options.format}
              onValueChange={(v: "pdf" | "png" | "jpg" | "svg" | "ai" | "eps") =>
                setOptions({ ...options, format: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF ({language === "ar" ? "معاينة" : "Preview"})</SelectItem>
                <SelectItem value="png">PNG ({language === "ar" ? "معاينة" : "Preview"})</SelectItem>
                <SelectItem value="jpg">JPEG ({language === "ar" ? "معاينة" : "Preview"})</SelectItem>
                <SelectItem value="svg">SVG ({language === "ar" ? "معاينة" : "Preview"})</SelectItem>
                {/* AI/EPS export is not implemented (exportDesign returns null
                    for them); keep disabled instead of failing silently. */}
                <SelectItem value="ai" disabled>Adobe Illustrator (AI) — {language === "ar" ? "قريبًا" : "soon"}</SelectItem>
                <SelectItem value="eps" disabled>EPS Vector — {language === "ar" ? "قريبًا" : "soon"}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {language === "ar"
                ? "ملف معاينة مرجعي. ملف القص الإنتاجي هو المخطط المُعتمد أعلاه."
                : "Reference preview only. The certified dieline above is the production cutting file."}
            </p>
          </div>

          <div>
            <Label>{language === "ar" ? "الدقة" : "Resolution (DPI)"}</Label>
            <Select
              value={options.resolution?.toString()}
              onValueChange={(v) =>
                setOptions({ ...options, resolution: parseInt(v) as 72 | 150 | 300 | 600 })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="72">72 DPI (Screen)</SelectItem>
                <SelectItem value="150">150 DPI (Draft)</SelectItem>
                <SelectItem value="300">300 DPI (Print)</SelectItem>
                <SelectItem value="600">600 DPI (High-quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{language === "ar" ? "وضع الألوان" : "Color Mode"}</Label>
            <Select
              value={options.colorMode}
              onValueChange={(v: "rgb" | "cmyk") => setOptions({ ...options, colorMode: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rgb">RGB (Screen)</SelectItem>
                <SelectItem value="cmyk">CMYK (Print)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="bleed">
              {language === "ar" ? "تضمين منطقة الحبر" : "Include Bleed"}
            </Label>
            <Switch
              id="bleed"
              checked={options.includeBleed}
              onCheckedChange={(checked) => setOptions({ ...options, includeBleed: checked })}
            />
          </div>

          {options.includeBleed && (
            <div>
              <Label>{language === "ar" ? "حجم الحبر (مم)" : "Bleed Size (mm)"}</Label>
              <Input
                type="number"
                value={options.bleedSize}
                onChange={(e) =>
                  setOptions({ ...options, bleedSize: parseFloat(e.target.value) || 3 })
                }
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="crop">
              {language === "ar" ? "تضمين علامات القطع" : "Include Crop Marks"}
            </Label>
            <Switch
              id="crop"
              checked={options.includeCropMarks}
              onCheckedChange={(checked) => setOptions({ ...options, includeCropMarks: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="die">
              {language === "ar" ? "تضمين خطوط إرشاد (ليست للقص)" : "Include alignment guides (not for cutting)"}
            </Label>
            <Switch
              id="die"
              checked={options.includeDieLines}
              onCheckedChange={(checked) => setOptions({ ...options, includeDieLines: checked })}
            />
          </div>

          <Button
            onClick={handleExport}
            disabled={exporting || texturesPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {texturesPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "ar" ? "جاري تحديث المعاينة..." : "Updating preview..."}
              </>
            ) : exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "ar" ? "جارٍ التصدير..." : "Exporting..."}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {language === "ar" ? "تصدير" : "Export"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

