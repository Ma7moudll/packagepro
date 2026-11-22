"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { isTexturesPending, subscribeTexturesPending } from "@/lib/editor/services/texture-status"
import { useDesignStore } from "@/lib/editor/state/store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Download, Loader2, BadgeCheck, ShieldAlert, RefreshCw } from "lucide-react"
import { exportDesign, ExportOptions } from "@/lib/editor/services/export"
import { useLanguage } from "@/providers/language-provider"
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
  const [exportError, setExportError] = useState("")
  const model=useDesignStore(s=>s.model)
  const printedFaces=model.faces.filter(f=>(model.printCoverage??"outside")==="both" || ((model.printCoverage??"outside")==="inside")===f.id.startsWith("inside_"))
  const certified = useCertifiedExport()
  const [options, setOptions] = useState<Partial<ExportOptions>>({
    format: "pdf",
    resolution: 300,
    colorMode: "rgb",
    includeBleed: false,
    bleedSize: 0,
    includeCropMarks: false,
    includeDieLines: false,
    flattenLayers: true,
  })

  useEffect(() => {
    if (open && certified.status === "idle") {
      certified.refresh()
    }
  }, [open, certified])

  const t = (en: string, ar: string) => (language === "ar" ? ar : en)

  const singleFace=options.format==="png" || options.format==="jpg"
  const previewFaceId=printedFaces.some(f=>f.id===options.faceId)?options.faceId:printedFaces[0]?.id
  const handleExport = async () => {
    setExporting(true);setExportError("")
    try {
      const fmt=options.format || "pdf"
      const blob=await exportDesign({...options,faceId:previewFaceId})
      const url=URL.createObjectURL(blob)
      const link=document.createElement("a")
      link.href=url
      link.download=`preview-${singleFace?previewFaceId+"-":""}${Date.now()}.${fmt}`
      document.body.appendChild(link);link.click();link.remove()
      setTimeout(()=>URL.revokeObjectURL(url),1000)
      setOpen(false)
    } catch(error) {
      setExportError(error instanceof Error?error.message:t("Preview export failed","فشل تصدير المعاينة"))
    } finally {setExporting(false)}
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {language === "ar" ? "تصدير" : "Export"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-preview-export-dialog>
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

          <div className="border-t pt-3">
            <h3 className="font-medium">{t("Local face previews (not saved)","معاينات الأوجه المحلية (غير محفوظة)")}</h3>
            <p className="text-xs text-muted-foreground">{t("PDF/SVG contain separate printed faces, not a registered net. PNG/JPEG contain one chosen face. RGB reference only, not for production.","PDF وSVG يعرضان أوجه الطباعة منفصلة، وليسا مخططًا مسطحًا مترابطًا. PNG وJPEG يعرضان وجهًا تختاره. مرجع RGB فقط، وليس للإنتاج.")}</p>
          </div>
          <div>
            <Label>{t("Format", "التنسيق")}</Label>
            <Select
              value={options.format}
              onValueChange={(v: "pdf" | "png" | "jpg" | "svg" | "ai" | "eps") =>
                setOptions({ ...options, format:v, ...(["png","jpg"].includes(v)?{includeCropMarks:false,includeDieLines:false}:{}) })
              }
            >
              <SelectTrigger data-preview-format>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF ({language === "ar" ? "أوجه منفصلة" : "Separate faces"})</SelectItem>
                <SelectItem value="png">PNG ({language === "ar" ? "وجه واحد" : "One face"})</SelectItem>
                <SelectItem value="jpg">JPEG ({language === "ar" ? "وجه واحد" : "One face"})</SelectItem>
                <SelectItem value="svg">SVG ({language === "ar" ? "صور مضمّنة" : "Raster artwork"})</SelectItem>
                {/* AI/EPS output is not implemented. Do not fabricate those bytes. */}
                <SelectItem value="ai" disabled>Adobe Illustrator (AI), {language === "ar" ? "غير متاح" : "unavailable"}</SelectItem>
                <SelectItem value="eps" disabled>EPS Vector, {language === "ar" ? "غير متاح" : "unavailable"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {singleFace && <div>
            <Label>{t("Face to download","الوجه المراد تنزيله")}</Label>
            <Select value={previewFaceId} onValueChange={faceId=>setOptions({...options,faceId})}>
              <SelectTrigger data-preview-face><SelectValue /></SelectTrigger>
              <SelectContent>{printedFaces.map(face=><SelectItem key={face.id} value={face.id}>{face.name} ({face.id})</SelectItem>)}</SelectContent>
            </Select>
            {options.format==="jpg" && <p className="text-xs text-muted-foreground">{t("JPEG uses a white backing where the artwork is transparent.","خلفية JPEG بيضاء في الأجزاء الشفافة من التصميم.")}</p>}
          </div>}

          <div>
            <Label>{t("Output sampling (PPI)","كثافة عينات الإخراج (PPI)")}</Label>
            <Select
              value={options.resolution?.toString()}
              onValueChange={(v) =>
                setOptions({ ...options, resolution: parseInt(v) as 72 | 150 | 300 | 600 })
              }
            >
              <SelectTrigger data-preview-resolution>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="72">72 PPI</SelectItem>
                <SelectItem value="150">150 PPI</SelectItem>
                <SelectItem value="300">300 PPI</SelectItem>
                <SelectItem value="600">600 PPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">{t("Sampling uses each face's model dimensions in mm. PNG/JPEG include output-density metadata. This does not certify original image detail or font fidelity.","تعتمد الكثافة على أبعاد كل وجه بالملليمتر، وتتضمن PNG وJPEG بيانات كثافة الإخراج. لا يثبت ذلك جودة تفاصيل الصور الأصلية أو تطابق الخطوط.")}</p>
          <div className="rounded-md bg-slate-50 p-2 text-xs" data-preview-limitations>
            {t("RGB only. CMYK conversion, editable artwork layers and production bleed are unavailable. Artwork is trimmed to face bounds; browser fonts and the saved canvas background are used.","RGB فقط. تحويل CMYK والطبقات القابلة للتعديل والنزيف الطباعي غير متاحة. يُقص التصميم عند حدود الوجه، مع استخدام خطوط المتصفح وخلفية مساحة العمل المحفوظة.")}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="crop">
              {t("Reference corner marks (not for cutting)","علامات زوايا مرجعية (ليست للقص)")}
            </Label>
            <Switch
              id="crop"
              disabled={singleFace}
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
              disabled={singleFace}
              checked={options.includeDieLines}
              onCheckedChange={(checked) => setOptions({ ...options, includeDieLines: checked })}
            />
          </div>

          {exportError && <p role="alert" className="text-xs text-red-700">{exportError}</p>}
          <Button
            data-preview-export
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

