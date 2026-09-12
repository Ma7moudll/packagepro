"use client"

import { useDesignStore } from "@/lib/editor/state/store"
import { mmToPx, BLEED_MM, SAFE_MM } from "@/lib/editor/geometry/units"
import { useLanguage } from "@/providers/language-provider"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Settings2 } from "lucide-react"

interface ZoneOverlaysProps {
  canvasWidth: number
  canvasHeight: number
  bleedSize?: number // in mm
  safeZoneSize?: number // in mm
  showBleed?: boolean
  showSafeZone?: boolean
}

export function ZoneOverlays({
  canvasWidth,
  canvasHeight,
  bleedSize = BLEED_MM,
  safeZoneSize = SAFE_MM,
  showBleed = true,
  showSafeZone = true,
}: ZoneOverlaysProps) {
  const bleedPixels = mmToPx(bleedSize)
  const safeZonePixels = mmToPx(safeZoneSize)

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Bleed Zone - outer red dashed border */}
      {showBleed && (
        <div
          className="absolute border-2 border-dashed border-red-500/50"
          style={{
            top: -bleedPixels,
            left: -bleedPixels,
            right: -bleedPixels,
            bottom: -bleedPixels,
            width: canvasWidth + bleedPixels * 2,
            height: canvasHeight + bleedPixels * 2,
          }}
        >
          {/* Bleed area fill */}
          <div
            className="absolute inset-0 bg-red-500/5"
            style={{
              clipPath: `polygon(
                0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                ${bleedPixels}px ${bleedPixels}px,
                ${bleedPixels}px ${canvasHeight + bleedPixels}px,
                ${canvasWidth + bleedPixels}px ${canvasHeight + bleedPixels}px,
                ${canvasWidth + bleedPixels}px ${bleedPixels}px,
                ${bleedPixels}px ${bleedPixels}px
              )`,
            }}
          />
          {/* Label */}
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-red-500 bg-white px-1 rounded">
            BLEED {bleedSize}mm
          </span>
        </div>
      )}

      {/* Safe Zone - inner green dashed border */}
      {showSafeZone && (
        <div
          className="absolute border-2 border-dashed border-emerald-500/50"
          style={{
            top: safeZonePixels,
            left: safeZonePixels,
            width: canvasWidth - safeZonePixels * 2,
            height: canvasHeight - safeZonePixels * 2,
          }}
        >
          {/* Label */}
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-emerald-500 bg-white px-1 rounded">
            SAFE ZONE
          </span>
        </div>
      )}

      {/* Corner marks for trim line */}
      {showBleed && (
        <>
          {/* Top-left corner */}
          <div className="absolute" style={{ top: 0, left: -bleedPixels - 10 }}>
            <div className="w-[10px] h-[1px] bg-slate-900" />
          </div>
          <div className="absolute" style={{ top: -bleedPixels - 10, left: 0 }}>
            <div className="w-[1px] h-[10px] bg-slate-900" />
          </div>

          {/* Top-right corner */}
          <div className="absolute" style={{ top: 0, right: -bleedPixels - 10 }}>
            <div className="w-[10px] h-[1px] bg-slate-900" />
          </div>
          <div className="absolute" style={{ top: -bleedPixels - 10, right: 0 }}>
            <div className="w-[1px] h-[10px] bg-slate-900" />
          </div>

          {/* Bottom-left corner */}
          <div className="absolute" style={{ bottom: 0, left: -bleedPixels - 10 }}>
            <div className="w-[10px] h-[1px] bg-slate-900" />
          </div>
          <div className="absolute" style={{ bottom: -bleedPixels - 10, left: 0 }}>
            <div className="w-[1px] h-[10px] bg-slate-900" />
          </div>

          {/* Bottom-right corner */}
          <div className="absolute" style={{ bottom: 0, right: -bleedPixels - 10 }}>
            <div className="w-[10px] h-[1px] bg-slate-900" />
          </div>
          <div className="absolute" style={{ bottom: -bleedPixels - 10, right: 0 }}>
            <div className="w-[1px] h-[10px] bg-slate-900" />
          </div>
        </>
      )}
    </div>
  )
}

// Settings panel for zone configuration
export function ZoneSettings() {
  const { language } = useLanguage()
  const [showBleed, setShowBleed] = useState(true)
  const [showSafeZone, setShowSafeZone] = useState(true)
  const [bleedSize, setBleedSize] = useState(BLEED_MM)
  const [safeZoneSize, setSafeZoneSize] = useState(SAFE_MM)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Settings2 className="h-4 w-4 mr-2" />
          {language === "ar" ? "مناطق الطباعة" : "Print Zones"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">
            {language === "ar" ? "إعدادات مناطق الطباعة" : "Print Zone Settings"}
          </h4>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-bleed" className="text-xs">
              {language === "ar" ? "إظهار منطقة Bleed" : "Show Bleed Zone"}
            </Label>
            <Switch
              id="show-bleed"
              checked={showBleed}
              onCheckedChange={setShowBleed}
            />
          </div>

          {showBleed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">
                  {language === "ar" ? "حجم Bleed" : "Bleed Size"}
                </Label>
                <span className="text-xs font-mono">{bleedSize}mm</span>
              </div>
              <Slider
                value={[bleedSize]}
                onValueChange={([v]) => setBleedSize(v)}
                min={1}
                max={10}
                step={0.5}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="show-safe" className="text-xs">
              {language === "ar" ? "إظهار المنطقة الآمنة" : "Show Safe Zone"}
            </Label>
            <Switch
              id="show-safe"
              checked={showSafeZone}
              onCheckedChange={setShowSafeZone}
            />
          </div>

          {showSafeZone && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">
                  {language === "ar" ? "حجم المنطقة الآمنة" : "Safe Zone Size"}
                </Label>
                <span className="text-xs font-mono">{safeZoneSize}mm</span>
              </div>
              <Slider
                value={[safeZoneSize]}
                onValueChange={([v]) => setSafeZoneSize(v)}
                min={2}
                max={15}
                step={0.5}
              />
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-[10px] text-slate-500">
              {language === "ar"
                ? "• Bleed: مساحة إضافية للقطع (أحمر)\n• Safe Zone: منطقة آمنة للنصوص المهمة (أخضر)"
                : "• Bleed: Extra area for trimming (red)\n• Safe Zone: Safe area for important text (green)"}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Hook for validating element positions against zones
export function useZoneValidation(bleedSize = BLEED_MM, safeZoneSize = SAFE_MM) {
  const layers = useDesignStore((s) => s.layers)
  const canvas = useDesignStore((s) => s.canvas)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  const bleedPixels = mmToPx(bleedSize)
  const safeZonePixels = mmToPx(safeZoneSize)

  const validateElement = (layer: typeof layers[0]) => {
    const warnings: string[] = []
    const { x, y } = layer.position

    // Check if element is outside bleed
    if (x < -bleedPixels || y < -bleedPixels) {
      warnings.push("Element extends beyond bleed area")
    }

    // Check if text is in safe zone
    if (layer.type === "text") {
      if (
        x < safeZonePixels ||
        y < safeZonePixels ||
        x > canvas.width - safeZonePixels ||
        y > canvas.height - safeZonePixels
      ) {
        warnings.push("Text may be too close to edge - consider moving to safe zone")
      }
    }

    return warnings
  }

  const getZoneWarnings = () => {
    const faceLayers = layers.filter((l) => l.faceId === selectedFace)
    const allWarnings: { layerId: string; layerName: string; warnings: string[] }[] = []

    for (const layer of faceLayers) {
      const warnings = validateElement(layer)
      if (warnings.length > 0) {
        allWarnings.push({
          layerId: layer.id,
          layerName: layer.name,
          warnings,
        })
      }
    }

    return allWarnings
  }

  return { validateElement, getZoneWarnings }
}
