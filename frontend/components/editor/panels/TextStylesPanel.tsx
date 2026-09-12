"use client"

import { useState } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ColorPicker } from "@/components/editor/panels/ColorPicker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Palette,
  Sparkles,
  ArrowUpDown,
} from "lucide-react"

const FONT_FAMILIES = [
  { name: "Inter", category: "sans-serif" },
  { name: "Roboto", category: "sans-serif" },
  { name: "Open Sans", category: "sans-serif" },
  { name: "Montserrat", category: "sans-serif" },
  { name: "Poppins", category: "sans-serif" },
  { name: "Playfair Display", category: "serif" },
  { name: "Merriweather", category: "serif" },
  { name: "Lora", category: "serif" },
  { name: "Oswald", category: "sans-serif" },
  { name: "Raleway", category: "sans-serif" },
  { name: "Bebas Neue", category: "display" },
  { name: "Archivo Black", category: "display" },
  { name: "Righteous", category: "display" },
  { name: "Pacifico", category: "handwriting" },
  { name: "Dancing Script", category: "handwriting" },
  { name: "Caveat", category: "handwriting" },
  { name: "Satisfy", category: "handwriting" },
  { name: "Great Vibes", category: "handwriting" },
  { name: "Lobster", category: "display" },
  { name: "Anton", category: "sans-serif" },
  { name: "Cairo", category: "arabic" },
  { name: "Tajawal", category: "arabic" },
  { name: "Almarai", category: "arabic" },
  { name: "Amiri", category: "arabic" },
  { name: "Noto Sans Arabic", category: "arabic" },
]

const TEXT_PRESETS = [
  {
    id: "heading-bold",
    name: { en: "Bold Heading", ar: "عنوان عريض" },
    style: {
      fontSize: 48,
      fontWeight: 700,
      letterSpacing: -1,
      lineHeight: 1.1,
    },
  },
  {
    id: "elegant",
    name: { en: "Elegant", ar: "أنيق" },
    style: {
      fontFamily: "Playfair Display",
      fontSize: 36,
      fontWeight: 400,
      letterSpacing: 2,
      lineHeight: 1.3,
    },
  },
  {
    id: "modern",
    name: { en: "Modern Clean", ar: "عصري" },
    style: {
      fontFamily: "Montserrat",
      fontSize: 24,
      fontWeight: 500,
      letterSpacing: 4,
      lineHeight: 1.4,
    },
  },
  {
    id: "handwritten",
    name: { en: "Handwritten", ar: "مكتوب بخط اليد" },
    style: {
      fontFamily: "Dancing Script",
      fontSize: 32,
      fontWeight: 400,
      letterSpacing: 0,
      lineHeight: 1.5,
    },
  },
  {
    id: "minimal",
    name: { en: "Minimal", ar: "بسيط" },
    style: {
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: 300,
      letterSpacing: 1,
      lineHeight: 1.6,
    },
  },
]

export function TextStylesPanel() {
  const { language } = useLanguage()
  const layers = useDesignStore((s) => s.layers)
  const selectedIds = useDesignStore((s) => s.selectedLayerIds)
  const updateLayer = useDesignStore((s) => s.updateLayer)

  const selectedLayer = layers.find(
    (l) => selectedIds.includes(l.id) && l.type === "text"
  )

  const updateTextProp = (key: string, value: any) => {
    if (!selectedLayer) return
    updateLayer(selectedLayer.id, (l) => ({
      ...l,
      textProperties: {
        ...l.textProperties!,
        [key]: value,
      },
    }))
  }

  const updateShadow = (key: string, value: any) => {
    if (!selectedLayer) return
    const current = selectedLayer.textProperties?.shadow ?? {
      offsetX: 2,
      offsetY: 2,
      blur: 4,
      color: "#000000",
    }
    updateLayer(selectedLayer.id, (l) => ({
      ...l,
      textProperties: {
        ...l.textProperties!,
        shadow: { ...current, [key]: value },
      },
    }))
  }

  const toggleShadow = () => {
    if (!selectedLayer) return
    const tp = selectedLayer.textProperties!
    if (tp.shadow) {
      const { shadow, ...rest } = tp
      updateLayer(selectedLayer.id, (l) => ({
        ...l,
        textProperties: rest,
      }))
    } else {
      updateLayer(selectedLayer.id, (l) => ({
        ...l,
        textProperties: {
          ...l.textProperties!,
          shadow: { offsetX: 2, offsetY: 2, blur: 4, color: "#000000" },
        },
      }))
    }
  }

  const updateStroke = (key: string, value: any) => {
    if (!selectedLayer) return
    const current = selectedLayer.textProperties?.stroke ?? {
      width: 1,
      color: "#000000",
    }
    updateLayer(selectedLayer.id, (l) => ({
      ...l,
      textProperties: {
        ...l.textProperties!,
        stroke: { ...current, [key]: value },
      },
    }))
  }

  const toggleStroke = () => {
    if (!selectedLayer) return
    const tp = selectedLayer.textProperties!
    if (tp.stroke) {
      const { stroke, ...rest } = tp
      updateLayer(selectedLayer.id, (l) => ({
        ...l,
        textProperties: rest,
      }))
    } else {
      updateLayer(selectedLayer.id, (l) => ({
        ...l,
        textProperties: {
          ...l.textProperties!,
          stroke: { width: 1, color: "#000000" },
        },
      }))
    }
  }

  const applyPreset = (preset: (typeof TEXT_PRESETS)[0]) => {
    if (!selectedLayer) return
    updateLayer(selectedLayer.id, (l) => ({
      ...l,
      textProperties: {
        ...l.textProperties!,
        ...preset.style,
      },
    }))
  }

  if (!selectedLayer || !selectedLayer.textProperties) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        <Type className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        <p>{language === "ar" ? "اختر طبقة نص للتعديل" : "Select a text layer to edit"}</p>
      </div>
    )
  }

  const tp = selectedLayer.textProperties
  const shadow = tp.shadow
  const stroke = tp.stroke
  const curveRadius = tp.curveRadius ?? 0

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Font Family */}
        <div className="space-y-2">
          <Label className="text-xs font-bold">{language === "ar" ? "الخط" : "Font Family"}</Label>
          <Select
            value={tp.fontFamily}
            onValueChange={(v) => updateTextProp("fontFamily", v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font.name} value={font.name}>
                  <span style={{ fontFamily: font.name }}>{font.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Size & Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-bold">{language === "ar" ? "الحجم" : "Size"}</Label>
            <Input
              type="number"
              value={tp.fontSize}
              onChange={(e) => updateTextProp("fontSize", parseInt(e.target.value) || 16)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold">{language === "ar" ? "الوزن" : "Weight"}</Label>
            <Select
              value={tp.fontWeight.toString()}
              onValueChange={(v) => updateTextProp("fontWeight", parseInt(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">Thin (100)</SelectItem>
                <SelectItem value="200">Extra Light (200)</SelectItem>
                <SelectItem value="300">Light (300)</SelectItem>
                <SelectItem value="400">Regular (400)</SelectItem>
                <SelectItem value="500">Medium (500)</SelectItem>
                <SelectItem value="600">Semi Bold (600)</SelectItem>
                <SelectItem value="700">Bold (700)</SelectItem>
                <SelectItem value="800">Extra Bold (800)</SelectItem>
                <SelectItem value="900">Black (900)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Line Height & Letter Spacing */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold">{language === "ar" ? "ارتفاع السطر" : "Line Height"}</Label>
              <span className="text-[10px] font-mono text-slate-500">{tp.lineHeight.toFixed(1)}</span>
            </div>
            <Slider
              value={[tp.lineHeight * 10]}
              onValueChange={([v]) => updateTextProp("lineHeight", v / 10)}
              min={8}
              max={30}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold">{language === "ar" ? "تباعد الحروف" : "Letter Spacing"}</Label>
              <span className="text-[10px] font-mono text-slate-500">{tp.letterSpacing}px</span>
            </div>
            <Slider
              value={[tp.letterSpacing + 10]}
              onValueChange={([v]) => updateTextProp("letterSpacing", v - 10)}
              min={0}
              max={30}
              step={1}
            />
          </div>
        </div>

        {/* Text Alignment */}
        <div className="space-y-2">
          <Label className="text-xs font-bold">{language === "ar" ? "المحاذاة" : "Alignment"}</Label>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {[
              { value: "left", icon: AlignLeft },
              { value: "center", icon: AlignCenter },
              { value: "right", icon: AlignRight },
              { value: "justify", icon: AlignJustify },
            ].map(({ value, icon: Icon }) => (
              <Button
                key={value}
                variant={tp.align === value ? "secondary" : "ghost"}
                size="sm"
                className="flex-1 h-8"
                onClick={() => updateTextProp("align", value)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>

        {/* Text Color */}
        <div className="space-y-2">
          <Label className="text-xs font-bold">{language === "ar" ? "اللون" : "Color"}</Label>
          <div className="flex items-center gap-2">
            <ColorPicker value={tp.color} onChange={(c) => updateTextProp("color", c)} size="md" />
            <Input
              value={tp.color}
              onChange={(e) => updateTextProp("color", e.target.value)}
              className="h-9 font-mono text-xs flex-1"
            />
          </div>
        </div>

        {/* Curve Text */}
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {language === "ar" ? "نص منحني" : "Curved Text"}
            </Label>
            <Button
              variant={curveRadius !== 0 ? "secondary" : "outline"}
              size="sm"
              className="h-6 text-[10px]"
              onClick={() => updateTextProp("curveRadius", curveRadius !== 0 ? 0 : 150)}
            >
              {curveRadius !== 0 ? (language === "ar" ? "مفعّل" : "On") : (language === "ar" ? "معطّل" : "Off")}
            </Button>
          </div>
          {curveRadius !== 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px]">{language === "ar" ? "نصف القطر" : "Radius"}</Label>
                <span className="text-[10px] font-mono text-slate-500">{curveRadius}px</span>
              </div>
              <Slider
                value={[curveRadius]}
                onValueChange={([v]) => updateTextProp("curveRadius", v)}
                min={30}
                max={500}
                step={10}
              />
              <p className="text-[9px] text-slate-400">
                {language === "ar"
                  ? "نصف قطر أصغر = انحناء أكبر"
                  : "Smaller radius = tighter curve"}
              </p>
            </div>
          )}
        </div>

        {/* Text Shadow */}
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold">{language === "ar" ? "الظل" : "Text Shadow"}</Label>
            <Button
              variant={shadow ? "secondary" : "outline"}
              size="sm"
              className="h-6 text-[10px]"
              onClick={toggleShadow}
            >
              {shadow ? (language === "ar" ? "مفعّل" : "On") : (language === "ar" ? "معطّل" : "Off")}
            </Button>
          </div>
          {shadow && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">X</Label>
                  <Input
                    type="number"
                    value={shadow.offsetX}
                    onChange={(e) => updateShadow("offsetX", parseInt(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Y</Label>
                  <Input
                    type="number"
                    value={shadow.offsetY}
                    onChange={(e) => updateShadow("offsetY", parseInt(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">{language === "ar" ? "تمويه" : "Blur"}</Label>
                <Slider
                  value={[shadow.blur]}
                  onValueChange={([v]) => updateShadow("blur", v)}
                  min={0}
                  max={20}
                />
              </div>
              <div className="flex items-center gap-2">
                <ColorPicker value={shadow.color} onChange={(c) => updateShadow("color", c)} size="sm" />
                <Input
                  value={shadow.color}
                  onChange={(e) => updateShadow("color", e.target.value)}
                  className="h-7 text-[10px] font-mono flex-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Text Outline */}
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold">{language === "ar" ? "الإطار" : "Outline"}</Label>
            <Button
              variant={stroke ? "secondary" : "outline"}
              size="sm"
              className="h-6 text-[10px]"
              onClick={toggleStroke}
            >
              {stroke ? (language === "ar" ? "مفعّل" : "On") : (language === "ar" ? "معطّل" : "Off")}
            </Button>
          </div>
          {stroke && (
            <div className="space-y-3">
              <div>
                <Label className="text-[10px]">{language === "ar" ? "السماكة" : "Width"}</Label>
                <Slider
                  value={[stroke.width]}
                  onValueChange={([v]) => updateStroke("width", v)}
                  min={1}
                  max={10}
                />
              </div>
              <div className="flex items-center gap-2">
                <ColorPicker value={stroke.color} onChange={(c) => updateStroke("color", c)} size="sm" />
                <Input
                  value={stroke.color}
                  onChange={(e) => updateStroke("color", e.target.value)}
                  className="h-7 text-[10px] font-mono flex-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Text Presets */}
        <div className="space-y-3">
          <Label className="text-xs font-bold flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            {language === "ar" ? "أنماط جاهزة" : "Style Presets"}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {TEXT_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                className="h-auto py-2 px-3 text-left justify-start"
                onClick={() => applyPreset(preset)}
              >
                <span className="text-[10px]">{language === "ar" ? preset.name.ar : preset.name.en}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-white border rounded-lg">
          <p className="text-[10px] text-slate-400 mb-2">{language === "ar" ? "معاينة" : "Preview"}</p>
          <p
            style={{
              fontFamily: tp.fontFamily,
              fontSize: Math.min(tp.fontSize, 32),
              fontWeight: tp.fontWeight,
              letterSpacing: tp.letterSpacing,
              lineHeight: tp.lineHeight,
              color: tp.color,
              textAlign: tp.align as any,
              textShadow: shadow
                ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color}`
                : "none",
              WebkitTextStroke: stroke ? `${stroke.width}px ${stroke.color}` : "none",
            }}
          >
            {tp.content.slice(0, 50) || "Sample Text"}
          </p>
          {curveRadius !== 0 && (
            <p className="text-[9px] text-blue-500 mt-1">
              {language === "ar" ? "سيتم عرض النص على شكل منحني" : "Text will appear curved on canvas"}
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
