"use client"

import { useState, useRef } from "react"
import { useBrandStore } from "@/lib/editor/state/brand-store"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ColorPicker } from "@/components/editor/panels/ColorPicker"
import { nanoid } from "nanoid"

const SAFE_ZONE_RATIO = 0.8

function computeSmartScale(
  imageW: number,
  imageH: number,
  canvasW: number,
  canvasH: number
): number {
  const safeW = canvasW * SAFE_ZONE_RATIO
  const safeH = canvasH * SAFE_ZONE_RATIO
  const scaleX = safeW / imageW
  const scaleY = safeH / imageH
  return Math.min(scaleX, scaleY, 1)
}
import {
  Palette,
  Type,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Check,
  X,
  Eye,
  EyeOff,
} from "lucide-react"

const FONT_OPTIONS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat",
  "Poppins", "Playfair Display", "Merriweather", "Georgia",
  "Courier New", "Times New Roman", "Arial", "Helvetica",
  "Fira Sans", "Nunito", "Raleway", "Ubuntu", "Source Sans Pro",
]

export function BrandKitPanel() {
  const { language } = useLanguage()
  const { brandKit, addColor, removeColor, addFont, removeFont, addLogo, removeLogo } = useBrandStore()
  const addLayer = useDesignStore((s) => s.addLayer)
  const [addingColor, setAddingColor] = useState(false)
  const [newColor, setNewColor] = useState("#3b82f6")
  const [addingFont, setAddingFont] = useState(false)
  const [newFont, setNewFont] = useState("")
  const [showAllFonts, setShowAllFonts] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      addLogo({ id: nanoid(), name: file.name, dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const handleAddColor = () => {
    addColor(newColor)
    setAddingColor(false)
  }

  const handleAddFont = () => {
    if (newFont.trim()) {
      addFont(newFont.trim())
      setNewFont("")
      setAddingFont(false)
    }
  }

  const applyBrandColor = (color: string) => {
    addLayer({
      type: "shape",
      name: "Brand Color Swatch",
      shapeProperties: {
        shape: "rect",
        fill: color,
        stroke: "#e2e8f0",
        strokeWidth: 1,
        cornerRadius: 4,
      },
    })
  }

  const applyBrandLogo = (logo: { id: string; name: string; dataUrl: string }) => {
    const { canvas } = useDesignStore.getState()
    const img = new Image()
    img.onload = () => {
      const scale = computeSmartScale(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height)
      addLayer({
        type: "image",
        name: logo.name,
        imageProperties: {
          src: logo.dataUrl,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        },
        position: { x: canvas.width / 2, y: canvas.height / 2 },
        scale: { x: scale, y: scale },
      })
    }
    img.src = logo.dataUrl
  }

  const applyBrandFont = (font: string) => {
    addLayer({
      type: "text",
      name: `${font} Text`,
      textProperties: {
        content: language === "ar" ? "نص تجريبي" : "Sample Text",
        fontFamily: font,
        fontSize: 24,
        fontWeight: 400,
        align: "center",
        color: "#000000",
        lineHeight: 1.2,
        letterSpacing: 0,
      },
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {language === "ar" ? "العلامة التجارية" : "Brand Kit"}
        </h3>
        <p className="text-[10px] text-slate-400 mt-1">
          {language === "ar"
            ? "احفظ ألوان وشعارات علامتك التجارية للوصول السريع"
            : "Save your brand colors, logos, and fonts for quick access"}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Brand Colors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                {language === "ar" ? "الألوان" : "Colors"}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setAddingColor(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {addingColor && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 rounded-lg">
                <ColorPicker value={newColor} onChange={setNewColor} size="sm" />
                <Input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-7 text-xs font-mono flex-1"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={handleAddColor}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setAddingColor(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {brandKit.colors.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">
                {language === "ar" ? "لا توجد ألوان بعد" : "No colors yet"}
              </p>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {brandKit.colors.map((color) => (
                  <div key={color} className="group relative">
                    <button
                      className="w-full aspect-square rounded-lg border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer overflow-hidden"
                      style={{ backgroundColor: color }}
                      onClick={() => applyBrandColor(color)}
                      title={language === "ar" ? "أضف للتصميم" : "Add to design"}
                    />
                    <button
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      onClick={(e) => { e.stopPropagation(); removeColor(color) }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Brand Fonts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" />
                {language === "ar" ? "الخطوط" : "Fonts"}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setAddingFont(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {addingFont && (
              <div className="flex items-center gap-2 mb-3">
                <Input
                  value={newFont}
                  onChange={(e) => setNewFont(e.target.value)}
                  placeholder={language === "ar" ? "اسم الخط..." : "Font name..."}
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddFont()}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={handleAddFont}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setAddingFont(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {brandKit.fonts.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">
                {language === "ar" ? "لا توجد خطوط بعد" : "No fonts yet"}
              </p>
            ) : (
              <div className="space-y-1">
                {brandKit.fonts.map((font) => (
                  <div key={font} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                    onClick={() => applyBrandFont(font)}
                  >
                    <div>
                      <span className="text-sm" style={{ fontFamily: font }}>{font}</span>
                      <p className="text-[9px] text-slate-400">{font}</p>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all"
                      onClick={(e) => { e.stopPropagation(); removeFont(font) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAllFonts && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg grid grid-cols-2 gap-1">
                {FONT_OPTIONS.filter((f) => !brandKit.fonts.includes(f)).map((font) => (
                  <button
                    key={font}
                    className="text-[10px] text-left p-1.5 rounded hover:bg-white hover:shadow-sm transition-all"
                    style={{ fontFamily: font }}
                    onClick={() => addFont(font)}
                  >
                    {font}
                  </button>
                ))}
              </div>
            )}

            <button
              className="text-[10px] text-blue-600 hover:text-blue-800 mt-1"
              onClick={() => setShowAllFonts(!showAllFonts)}
            >
              {showAllFonts
                ? (language === "ar" ? "إخفاء القائمة" : "Hide list")
                : (language === "ar" ? "عرض كل الخطوط" : "Browse all fonts")}
            </button>
          </div>

          {/* Brand Logos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                {language === "ar" ? "الشعارات" : "Logos"}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />

            {brandKit.logos.length === 0 ? (
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-slate-400 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400">
                  {language === "ar" ? "اضغط لرفع شعار" : "Click to upload logo"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {brandKit.logos.map((logo) => (
                  <div key={logo.id} className="group relative">
                    <button
                      className="w-full aspect-square rounded-lg border border-slate-200 overflow-hidden p-2 bg-white hover:border-slate-400 transition-all"
                      onClick={() => applyBrandLogo(logo)}
                    >
                      <img
                        src={logo.dataUrl}
                        alt={logo.name}
                        className="w-full h-full object-contain"
                      />
                    </button>
                    <button
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      onClick={(e) => { e.stopPropagation(); removeLogo(logo.id) }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                <button
                  className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center hover:border-slate-400 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-5 w-5 text-slate-300" />
                </button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
