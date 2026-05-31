"use client"

import React, { useState, isValidElement } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download, FileImage, FileText, FileCode } from "lucide-react"
import { fabric } from "fabric"
import { useLanguage } from "@/providers/language-provider"

interface ExportDialogProps {
  canvas: fabric.Canvas | null
  trigger?: React.ReactElement
}

export function ExportDialog({ canvas, trigger }: ExportDialogProps) {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<"png" | "jpg" | "pdf" | "svg" | "dieline">("png")
  const [resolution, setResolution] = useState<"72" | "150" | "300">("300")
  const [includeBleed, setIncludeBleed] = useState(true)
  const [includeCropMarks, setIncludeCropMarks] = useState(false)
  const [colorMode, setColorMode] = useState<"rgb" | "cmyk">("rgb")
  const [exporting, setExporting] = useState(false)

  const exportDesign = async () => {
    if (!canvas) return

    setExporting(true)
    try {
      switch (format) {
        case "png":
        case "jpg":
          await exportImage(format, parseInt(resolution))
          break
        case "pdf":
          await exportPDF(parseInt(resolution))
          break
        case "svg":
          await exportSVG()
          break
        case "dieline":
          await exportDieline()
          break
      }
      setOpen(false)
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setExporting(false)
    }
  }

  const exportImage = async (format: "png" | "jpg", dpi: number) => {
    if (!canvas) return

    // Calculate multiplier based on DPI
    const multiplier = dpi / 96 // 96 is default browser DPI

    const dataURL = canvas.toDataURL({
      format: format === "jpg" ? "jpeg" : "png",
      quality: format === "jpg" ? 0.95 : 1,
      multiplier: multiplier,
    })

    const link = document.createElement("a")
    link.download = `design.${format}`
    link.href = dataURL
    link.click()
  }

  const exportPDF = async (dpi: number) => {
    // PDF export would require a library like jsPDF
    // For now, export as high-res PNG
    await exportImage("png", dpi)
  }

  const exportSVG = async () => {
    if (!canvas) return

    const svg = canvas.toSVG()
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.download = "design.svg"
    link.href = url
    link.click()

    URL.revokeObjectURL(url)
  }

  const exportDieline = async () => {
    // Dieline export would generate a 2D flat view
    // This is a placeholder - actual implementation would require backend
    if (!canvas) return
    await exportImage("pdf", 300)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && isValidElement(trigger) ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {language === "ar" ? "تصدير" : "Export"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {language === "ar" ? "تصدير التصميم" : "Export Design"}
          </DialogTitle>
          <DialogDescription>
            {language === "ar" ? "اختر التنسيق والخيارات للتصدير" : "Choose format and options for export"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <Label>{language === "ar" ? "التنسيق" : "Format"}</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">
                  PNG
                </SelectItem>
                <SelectItem value="jpg">
                  JPG
                </SelectItem>
                <SelectItem value="pdf">
                  PDF
                </SelectItem>
                <SelectItem value="svg">
                  SVG
                </SelectItem>
                <SelectItem value="dieline">
                  {language === "ar" ? "Dieline PDF" : "Dieline PDF"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resolution (for images/PDF) */}
          {(format === "png" || format === "jpg" || format === "pdf") && (
            <div>
              <Label>{language === "ar" ? "الدقة (DPI)" : "Resolution (DPI)"}</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="72">72 DPI (Web)</SelectItem>
                  <SelectItem value="150">150 DPI (Medium)</SelectItem>
                  <SelectItem value="300">300 DPI (Print)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Color Mode */}
          <div>
            <Label>{language === "ar" ? "وضع الألوان" : "Color Mode"}</Label>
            <Select value={colorMode} onValueChange={(v) => setColorMode(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rgb">RGB</SelectItem>
                <SelectItem value="cmyk">CMYK (Print)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bleed"
                checked={includeBleed}
                onCheckedChange={(checked) => setIncludeBleed(checked as boolean)}
              />
              <Label htmlFor="bleed" className="text-sm">
                {language === "ar" ? "تضمين منطقة Bleed" : "Include Bleed Area"}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cropMarks"
                checked={includeCropMarks}
                onCheckedChange={(checked) => setIncludeCropMarks(checked as boolean)}
              />
              <Label htmlFor="cropMarks" className="text-sm">
                {language === "ar" ? "تضمين Crop Marks" : "Include Crop Marks"}
              </Label>
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={exportDesign}
            disabled={exporting || !canvas}
            className="w-full"
          >
            {exporting ? (
              language === "ar" ? "جاري التصدير..." : "Exporting..."
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

