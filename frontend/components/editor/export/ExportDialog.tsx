"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Download, Loader2 } from "lucide-react"
import { exportDesign, ExportOptions } from "@/lib/editor/services/export"
import { useLanguage } from "@/providers/language-provider"
import { generateAI, generateEPS, downloadBlob } from "@/lib/editor/services/vector-export"

export function ExportDialog() {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
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

  const handleExport = async () => {
    setExporting(true)
    try {
      const fmt = options.format || "pdf"
      if (fmt === "ai" || fmt === "eps") {
        const canvasEl = document.querySelector("canvas")
        if (canvasEl) {
          const fabricCanvas = (window as any).__fabricCanvas || null
          if (fabricCanvas) {
            const svg = fabricCanvas.toSVG()
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
          <div>
            <Label>{language === "ar" ? "التنسيق" : "Format"}</Label>
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
                <SelectItem value="pdf">PDF (Print-ready)</SelectItem>
                <SelectItem value="png">PNG (High-res)</SelectItem>
                <SelectItem value="jpg">JPEG</SelectItem>
                <SelectItem value="svg">SVG (Vector)</SelectItem>
                <SelectItem value="ai">Adobe Illustrator (AI)</SelectItem>
                <SelectItem value="eps">EPS Vector</SelectItem>
              </SelectContent>
            </Select>
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
              {language === "ar" ? "تضمين خطوط القطع" : "Include Die Lines"}
            </Label>
            <Switch
              id="die"
              checked={options.includeDieLines}
              onCheckedChange={(checked) => setOptions({ ...options, includeDieLines: checked })}
            />
          </div>

          <Button
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {exporting ? (
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

