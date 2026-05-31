"use client"

import { useState, useCallback, useEffect } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Image as ImageIcon,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  RotateCcw,
  Crop,
  Sun,
  Contrast,
  Droplets,
  Palette,
  RefreshCw,
  Check,
  X,
} from "lucide-react"

interface ImageFilters {
  brightness: number
  contrast: number
  saturation: number
  blur: number
  grayscale: number
  sepia: number
  hueRotate: number
  invert: number
}

const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  invert: 0,
}

// Filter presets
const FILTER_PRESETS = [
  { name: { en: "Original", ar: "أصلي" }, filters: DEFAULT_FILTERS },
  {
    name: { en: "Vivid", ar: "زاهي" },
    filters: { ...DEFAULT_FILTERS, saturation: 130, contrast: 110 },
  },
  {
    name: { en: "Warm", ar: "دافئ" },
    filters: { ...DEFAULT_FILTERS, sepia: 30, saturation: 110 },
  },
  {
    name: { en: "Cool", ar: "بارد" },
    filters: { ...DEFAULT_FILTERS, hueRotate: 180, saturation: 80 },
  },
  {
    name: { en: "B&W", ar: "أبيض وأسود" },
    filters: { ...DEFAULT_FILTERS, grayscale: 100 },
  },
  {
    name: { en: "Vintage", ar: "عتيق" },
    filters: { ...DEFAULT_FILTERS, sepia: 50, contrast: 90, brightness: 90 },
  },
  {
    name: { en: "High Contrast", ar: "تباين عالي" },
    filters: { ...DEFAULT_FILTERS, contrast: 150, brightness: 105 },
  },
  {
    name: { en: "Soft", ar: "ناعم" },
    filters: { ...DEFAULT_FILTERS, brightness: 105, contrast: 90, blur: 1 },
  },
]

export function ImageEditPanel() {
  const { language } = useLanguage()
  const layers = useDesignStore((s) => s.layers)
  const selectedIds = useDesignStore((s) => s.selectedLayerIds)
  const updateLayer = useDesignStore((s) => s.updateLayer)

  const selectedLayer = layers.find(
    (l) => selectedIds.includes(l.id) && l.type === "image"
  )

  const [filters, setFilters] = useState<ImageFilters>(DEFAULT_FILTERS)
  const [cropMode, setCropMode] = useState(false)

  // Reset filters when selection changes
  useEffect(() => {
    setFilters(DEFAULT_FILTERS)
  }, [selectedLayer?.id])

  // Apply CSS filter string
  const getFilterString = useCallback((f: ImageFilters) => {
    return `
      brightness(${f.brightness}%)
      contrast(${f.contrast}%)
      saturate(${f.saturation}%)
      blur(${f.blur}px)
      grayscale(${f.grayscale}%)
      sepia(${f.sepia}%)
      hue-rotate(${f.hueRotate}deg)
      invert(${f.invert}%)
    `.trim()
  }, [])

  // Flip horizontal
  const handleFlipHorizontal = useCallback(() => {
    if (!selectedLayer) return
    updateLayer(selectedLayer.id, (l) => ({
      ...l,
      scale: { x: -l.scale.x, y: l.scale.y },
    }))
  }, [selectedLayer, updateLayer])

  // Flip vertical
  const handleFlipVertical = useCallback(() => {
    if (!selectedLayer) return
    updateLayer(selectedLayer.id, (l) => ({
      ...l,
      scale: { x: l.scale.x, y: -l.scale.y },
    }))
  }, [selectedLayer, updateLayer])

  // Rotate
  const handleRotate = useCallback(
    (degrees: number) => {
      if (!selectedLayer) return
      updateLayer(selectedLayer.id, (l) => ({
        ...l,
        rotation: l.rotation + (degrees * Math.PI) / 180,
      }))
    },
    [selectedLayer, updateLayer]
  )

  // Apply filter preset
  const applyPreset = useCallback((preset: (typeof FILTER_PRESETS)[0]) => {
    setFilters(preset.filters)
  }, [])

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  if (!selectedLayer || !selectedLayer.imageProperties) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        <p>{language === "ar" ? "اختر صورة للتعديل" : "Select an image to edit"}</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Image Preview */}
        <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border">
          <img
            src={selectedLayer.imageProperties.src}
            alt="Preview"
            className="w-full h-full object-contain"
            style={{ filter: getFilterString(filters) }}
          />
        </div>

        {/* Transform Tools */}
        <div className="space-y-3">
          <Label className="text-xs font-bold flex items-center gap-2">
            <RefreshCw className="h-3 w-3" />
            {language === "ar" ? "التحويلات" : "Transform"}
          </Label>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 flex flex-col gap-1"
              onClick={handleFlipHorizontal}
              title={language === "ar" ? "قلب أفقي" : "Flip Horizontal"}
            >
              <FlipHorizontal className="h-4 w-4" />
              <span className="text-[9px]">{language === "ar" ? "أفقي" : "H-Flip"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 flex flex-col gap-1"
              onClick={handleFlipVertical}
              title={language === "ar" ? "قلب رأسي" : "Flip Vertical"}
            >
              <FlipVertical className="h-4 w-4" />
              <span className="text-[9px]">{language === "ar" ? "رأسي" : "V-Flip"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 flex flex-col gap-1"
              onClick={() => handleRotate(-90)}
              title={language === "ar" ? "تدوير يسار" : "Rotate Left"}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="text-[9px]">-90°</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 flex flex-col gap-1"
              onClick={() => handleRotate(90)}
              title={language === "ar" ? "تدوير يمين" : "Rotate Right"}
            >
              <RotateCw className="h-4 w-4" />
              <span className="text-[9px]">+90°</span>
            </Button>
          </div>
        </div>

        {/* Filter Presets */}
        <div className="space-y-3">
          <Label className="text-xs font-bold flex items-center gap-2">
            <Palette className="h-3 w-3" />
            {language === "ar" ? "فلاتر جاهزة" : "Filter Presets"}
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {FILTER_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(preset)}
                className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition-all relative group"
              >
                <img
                  src={selectedLayer.imageProperties?.src}
                  alt={preset.name.en}
                  className="w-full h-full object-cover"
                  style={{ filter: getFilterString(preset.filters) }}
                />
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] py-0.5 text-center">
                  {language === "ar" ? preset.name.ar : preset.name.en}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Adjustments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold flex items-center gap-2">
              <Sun className="h-3 w-3" />
              {language === "ar" ? "تعديلات يدوية" : "Manual Adjustments"}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={resetFilters}
            >
              {language === "ar" ? "إعادة ضبط" : "Reset"}
            </Button>
          </div>

          {/* Brightness */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] flex items-center gap-1">
                <Sun className="h-3 w-3" />
                {language === "ar" ? "السطوع" : "Brightness"}
              </Label>
              <span className="text-[10px] font-mono">{filters.brightness}%</span>
            </div>
            <Slider
              value={[filters.brightness]}
              onValueChange={([v]) => setFilters({ ...filters, brightness: v })}
              min={0}
              max={200}
              step={1}
            />
          </div>

          {/* Contrast */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] flex items-center gap-1">
                <Contrast className="h-3 w-3" />
                {language === "ar" ? "التباين" : "Contrast"}
              </Label>
              <span className="text-[10px] font-mono">{filters.contrast}%</span>
            </div>
            <Slider
              value={[filters.contrast]}
              onValueChange={([v]) => setFilters({ ...filters, contrast: v })}
              min={0}
              max={200}
              step={1}
            />
          </div>

          {/* Saturation */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                {language === "ar" ? "التشبع" : "Saturation"}
              </Label>
              <span className="text-[10px] font-mono">{filters.saturation}%</span>
            </div>
            <Slider
              value={[filters.saturation]}
              onValueChange={([v]) => setFilters({ ...filters, saturation: v })}
              min={0}
              max={200}
              step={1}
            />
          </div>

          {/* Blur */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px]">{language === "ar" ? "التمويه" : "Blur"}</Label>
              <span className="text-[10px] font-mono">{filters.blur}px</span>
            </div>
            <Slider
              value={[filters.blur]}
              onValueChange={([v]) => setFilters({ ...filters, blur: v })}
              min={0}
              max={20}
              step={0.5}
            />
          </div>

          {/* Grayscale */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px]">{language === "ar" ? "تدرج رمادي" : "Grayscale"}</Label>
              <span className="text-[10px] font-mono">{filters.grayscale}%</span>
            </div>
            <Slider
              value={[filters.grayscale]}
              onValueChange={([v]) => setFilters({ ...filters, grayscale: v })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Sepia */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px]">{language === "ar" ? "بني داكن" : "Sepia"}</Label>
              <span className="text-[10px] font-mono">{filters.sepia}%</span>
            </div>
            <Slider
              value={[filters.sepia]}
              onValueChange={([v]) => setFilters({ ...filters, sepia: v })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Hue Rotate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px]">{language === "ar" ? "تدوير الألوان" : "Hue Rotate"}</Label>
              <span className="text-[10px] font-mono">{filters.hueRotate}°</span>
            </div>
            <Slider
              value={[filters.hueRotate]}
              onValueChange={([v]) => setFilters({ ...filters, hueRotate: v })}
              min={0}
              max={360}
              step={1}
            />
          </div>
        </div>

        {/* Apply Filters Note */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-[10px] text-amber-800">
            {language === "ar"
              ? "ملاحظة: الفلاتر تُعرض للمعاينة فقط حالياً. سيتم تطبيقها عند التصدير."
              : "Note: Filters are preview-only. They will be applied on export."}
          </p>
        </div>
      </div>
    </ScrollArea>
  )
}
