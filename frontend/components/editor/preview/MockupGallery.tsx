"use client"

import { useState, useCallback } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Image as ImageIcon,
  Download,
  Loader2,
  Camera,
  Sun,
  Moon,
  Maximize2,
  Check,
} from "lucide-react"

// Mockup scenes/environments
const MOCKUP_SCENES = [
  {
    id: "studio-white",
    name: { en: "Studio White", ar: "استوديو أبيض" },
    background: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
    shadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
    category: "studio",
  },
  {
    id: "studio-dark",
    name: { en: "Studio Dark", ar: "استوديو داكن" },
    background: "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)",
    shadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    category: "studio",
  },
  {
    id: "studio-gradient",
    name: { en: "Gradient Purple", ar: "تدرج بنفسجي" },
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    shadow: "0 25px 50px -12px rgba(102,126,234,0.3)",
    category: "studio",
  },
  {
    id: "nature-wood",
    name: { en: "Wooden Surface", ar: "سطح خشبي" },
    background: "linear-gradient(135deg, #8B4513 0%, #A0522D 100%)",
    shadow: "0 25px 50px -12px rgba(139,69,19,0.3)",
    category: "lifestyle",
  },
  {
    id: "nature-marble",
    name: { en: "Marble", ar: "رخام" },
    background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)",
    shadow: "0 25px 50px -12px rgba(0,0,0,0.1)",
    category: "lifestyle",
  },
  {
    id: "nature-concrete",
    name: { en: "Concrete", ar: "خرسانة" },
    background: "linear-gradient(135deg, #636e72 0%, #b2bec3 100%)",
    shadow: "0 25px 50px -12px rgba(99,110,114,0.3)",
    category: "lifestyle",
  },
  {
    id: "eco-green",
    name: { en: "Eco Green", ar: "أخضر بيئي" },
    background: "linear-gradient(135deg, #a8e6cf 0%, #88d8b0 100%)",
    shadow: "0 25px 50px -12px rgba(136,216,176,0.3)",
    category: "eco",
  },
  {
    id: "luxury-gold",
    name: { en: "Luxury Gold", ar: "ذهبي فاخر" },
    background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)",
    shadow: "0 25px 50px -12px rgba(212,175,55,0.2)",
    category: "luxury",
  },
]

// Scene categories
const SCENE_CATEGORIES = [
  { id: "all", name: { en: "All", ar: "الكل" } },
  { id: "studio", name: { en: "Studio", ar: "استوديو" } },
  { id: "lifestyle", name: { en: "Lifestyle", ar: "نمط حياة" } },
  { id: "eco", name: { en: "Eco", ar: "بيئي" } },
  { id: "luxury", name: { en: "Luxury", ar: "فاخر" } },
]

export function MockupGallery({
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: { open?: boolean; onOpenChange?: (open: boolean) => void; hideTrigger?: boolean } = {}) {
  const { language } = useLanguage()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  const [selectedScene, setSelectedScene] = useState(MOCKUP_SCENES[0])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<"png" | "jpg">("png")

  const model = useDesignStore((s) => s.model)

  // Filter scenes by category
  const filteredScenes = selectedCategory === "all"
    ? MOCKUP_SCENES
    : MOCKUP_SCENES.filter((s) => s.category === selectedCategory)

  // Export mockup as image
  const handleExport = useCallback(async () => {
    setExporting(true)

    try {
      // In a real implementation, you would capture the 3D scene
      // For now, we'll create a placeholder download
      const canvas = document.createElement("canvas")
      canvas.width = 1920
      canvas.height = 1080
      const ctx = canvas.getContext("2d")

      if (ctx) {
        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        gradient.addColorStop(0, "#f5f5f5")
        gradient.addColorStop(1, "#e0e0e0")
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw placeholder box
        ctx.fillStyle = "#d2b48c"
        ctx.shadowColor = "rgba(0,0,0,0.2)"
        ctx.shadowBlur = 30
        ctx.shadowOffsetY = 15
        ctx.fillRect(canvas.width / 2 - 200, canvas.height / 2 - 150, 400, 300)

        // Add text
        ctx.shadowBlur = 0
        ctx.fillStyle = "#333"
        ctx.font = "bold 24px Inter"
        ctx.textAlign = "center"
        ctx.fillText(`${model.type.replace(/_/g, " ")} Mockup`, canvas.width / 2, canvas.height / 2)
        ctx.font = "16px Inter"
        ctx.fillStyle = "#666"
        ctx.fillText(
          `${model.dimensions.length}x${model.dimensions.width}x${model.dimensions.height}mm`,
          canvas.width / 2,
          canvas.height / 2 + 30
        )
      }

      // Download
      const dataUrl = canvas.toDataURL(`image/${exportFormat}`, 0.95)
      const link = document.createElement("a")
      link.download = `mockup-${Date.now()}.${exportFormat}`
      link.href = dataUrl
      link.click()

      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setExporting(false)
    }
  }, [exportFormat, model])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Camera className="h-4 w-4 mr-2" />
            {language === "ar" ? "معاينة Mockup" : "Mockup Preview"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col p-4 sm:p-6 [&>button[data-slot=dialog-close]]:left-3 [&>button[data-slot=dialog-close]]:right-auto [&>button[data-slot=dialog-close]]:top-3 [&>button[data-slot=dialog-close]]:h-8 [&>button[data-slot=dialog-close]]:w-8 [&>button[data-slot=dialog-close]]:flex [&>button[data-slot=dialog-close]]:items-center [&>button[data-slot=dialog-close]]:justify-center">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 ps-10">
            <ImageIcon className="h-5 w-5" />
            {language === "ar" ? "معرض Mockup" : "Mockup Gallery"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 min-h-0">
          {/* Main Preview */}
          <div className="min-w-0 flex-1 flex flex-col gap-4">
            {/* Preview Container */}
            <div
              className="min-h-48 md:min-h-80 flex-1 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-500"
              style={{ background: selectedScene.background }}
            >
              {/* Product Preview Placeholder */}
              <div
                className="w-full max-w-64 h-40 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center transition-all duration-300"
                style={{ boxShadow: selectedScene.shadow }}
              >
                <div className="text-center">
                  <p className="text-sm font-bold text-amber-900">
                    {model.type.replace(/_/g, " ").toUpperCase()}
                  </p>
                  <p className="text-xs text-amber-700">
                    {model.dimensions.length} × {model.dimensions.width} × {model.dimensions.height}mm
                  </p>
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-xs mb-1 block">
                    {language === "ar" ? "الصيغة" : "Format"}
                  </Label>
                  <Select
                    value={exportFormat}
                    onValueChange={(v: "png" | "jpg") => setExportFormat(v)}
                  >
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="jpg">JPEG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-xs text-slate-500">
                  <p>1920 × 1080px</p>
                  <p>{language === "ar" ? "جودة عالية" : "High Quality"}</p>
                </div>
              </div>

              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {language === "ar" ? "جارٍ التصدير..." : "Exporting..."}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {language === "ar" ? "تصدير Mockup" : "Export Mockup"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Scene Selection Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-1">
              {SCENE_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {language === "ar" ? category.name.ar : category.name.en}
                </Button>
              ))}
            </div>

            {/* Scene Grid */}
            <ScrollArea className="h-48 md:h-72">
              <div className="grid grid-cols-2 gap-2 pr-2">
                {filteredScenes.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => setSelectedScene(scene)}
                    className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                      selectedScene.id === scene.id
                        ? "border-slate-900 ring-2 ring-slate-900/20"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {/* Scene Preview */}
                    <div
                      className="absolute inset-0"
                      style={{ background: scene.background }}
                    />

                    {/* Mini Product */}
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-6 rounded bg-amber-200"
                      style={{
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      }}
                    />

                    {/* Selected Indicator */}
                    {selectedScene.id === scene.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}

                    {/* Scene Name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                      <span className="text-[8px] text-white truncate block">
                        {language === "ar" ? scene.name.ar : scene.name.en}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Current Scene Info */}
            <div className="p-3 bg-slate-100 rounded-lg">
              <p className="text-xs font-bold">
                {language === "ar" ? selectedScene.name.ar : selectedScene.name.en}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {language === "ar"
                  ? "انقر على خلفية لتغيير المشهد"
                  : "Click a background to change scene"}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
