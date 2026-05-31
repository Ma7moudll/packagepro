"use client"

import { useState, useCallback } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
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
  Copy,
  Grid3X3,
  ArrowRight,
  ArrowDown,
  LayoutGrid,
  Loader2,
} from "lucide-react"

type RepeatPattern = "horizontal" | "vertical" | "grid" | "diagonal"

interface RepeatSettings {
  pattern: RepeatPattern
  countX: number
  countY: number
  spacingX: number
  spacingY: number
  offsetAlternate: boolean
}

const DEFAULT_SETTINGS: RepeatSettings = {
  pattern: "horizontal",
  countX: 3,
  countY: 3,
  spacingX: 20,
  spacingY: 20,
  offsetAlternate: false,
}

export function RepeatTool() {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<RepeatSettings>(DEFAULT_SETTINGS)
  const [applying, setApplying] = useState(false)

  const layers = useDesignStore((s) => s.layers)
  const selectedIds = useDesignStore((s) => s.selectedLayerIds)
  const addLayer = useDesignStore((s) => s.addLayer)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  const selectedLayer = layers.find((l) => selectedIds.includes(l.id))

  const applyRepeat = useCallback(async () => {
    if (!selectedLayer) return

    setApplying(true)

    try {
      const { pattern, countX, countY, spacingX, spacingY, offsetAlternate } = settings
      const basePosition = selectedLayer.position
      const newLayers: typeof selectedLayer[] = []

      let totalX = pattern === "vertical" ? 1 : countX
      let totalY = pattern === "horizontal" ? 1 : countY

      for (let y = 0; y < totalY; y++) {
        for (let x = 0; x < totalX; x++) {
          // Skip the original position
          if (x === 0 && y === 0) continue

          let offsetX = x * spacingX
          let offsetY = y * spacingY

          // Apply alternate row offset
          if (offsetAlternate && y % 2 === 1) {
            offsetX += spacingX / 2
          }

          // Handle diagonal pattern
          if (pattern === "diagonal") {
            offsetX = x * spacingX
            offsetY = x * spacingY
          }

          const newLayer = {
            ...selectedLayer,
            id: undefined, // Will be generated
            name: `${selectedLayer.name} Copy ${x + y * totalX}`,
            position: {
              x: basePosition.x + offsetX,
              y: basePosition.y + offsetY,
            },
          }

          addLayer(newLayer)
        }
      }

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 300))

      setOpen(false)
    } catch (error) {
      console.error("Error applying repeat:", error)
    } finally {
      setApplying(false)
    }
  }, [selectedLayer, settings, addLayer])

  const getPreviewCount = () => {
    const { pattern, countX, countY } = settings
    if (pattern === "horizontal") return countX
    if (pattern === "vertical") return countY
    if (pattern === "diagonal") return countX
    return countX * countY
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={!selectedLayer}
          title={language === "ar" ? "تكرار العنصر" : "Repeat Element"}
        >
          <Grid3X3 className="h-4 w-4 mr-1" />
          {language === "ar" ? "تكرار" : "Repeat"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {language === "ar" ? "تكرار العنصر" : "Repeat Element"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pattern Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">
              {language === "ar" ? "نمط التكرار" : "Repeat Pattern"}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "horizontal" as const, icon: ArrowRight, label: { en: "Horizontal", ar: "أفقي" } },
                { id: "vertical" as const, icon: ArrowDown, label: { en: "Vertical", ar: "رأسي" } },
                { id: "grid" as const, icon: LayoutGrid, label: { en: "Grid", ar: "شبكة" } },
                { id: "diagonal" as const, icon: Grid3X3, label: { en: "Diagonal", ar: "قطري" } },
              ].map(({ id, icon: Icon, label }) => (
                <Button
                  key={id}
                  variant={settings.pattern === id ? "secondary" : "outline"}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setSettings({ ...settings, pattern: id })}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px]">{language === "ar" ? label.ar : label.en}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Count Settings */}
          <div className="grid grid-cols-2 gap-4">
            {(settings.pattern === "horizontal" || settings.pattern === "grid" || settings.pattern === "diagonal") && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">
                    {language === "ar" ? "العدد الأفقي" : "Horizontal Count"}
                  </Label>
                  <span className="text-xs font-mono">{settings.countX}</span>
                </div>
                <Slider
                  value={[settings.countX]}
                  onValueChange={([v]) => setSettings({ ...settings, countX: v })}
                  min={2}
                  max={10}
                  step={1}
                />
              </div>
            )}

            {(settings.pattern === "vertical" || settings.pattern === "grid") && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">
                    {language === "ar" ? "العدد الرأسي" : "Vertical Count"}
                  </Label>
                  <span className="text-xs font-mono">{settings.countY}</span>
                </div>
                <Slider
                  value={[settings.countY]}
                  onValueChange={([v]) => setSettings({ ...settings, countY: v })}
                  min={2}
                  max={10}
                  step={1}
                />
              </div>
            )}
          </div>

          {/* Spacing Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">
                  {language === "ar" ? "التباعد X" : "Spacing X"}
                </Label>
                <span className="text-xs font-mono">{settings.spacingX}px</span>
              </div>
              <Slider
                value={[settings.spacingX]}
                onValueChange={([v]) => setSettings({ ...settings, spacingX: v })}
                min={0}
                max={200}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">
                  {language === "ar" ? "التباعد Y" : "Spacing Y"}
                </Label>
                <span className="text-xs font-mono">{settings.spacingY}px</span>
              </div>
              <Slider
                value={[settings.spacingY]}
                onValueChange={([v]) => setSettings({ ...settings, spacingY: v })}
                min={0}
                max={200}
                step={5}
              />
            </div>
          </div>

          {/* Offset Alternate Rows */}
          {settings.pattern === "grid" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="offset-alternate"
                checked={settings.offsetAlternate}
                onChange={(e) =>
                  setSettings({ ...settings, offsetAlternate: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="offset-alternate" className="text-xs cursor-pointer">
                {language === "ar" ? "إزاحة الصفوف المتبادلة" : "Offset Alternate Rows"}
              </Label>
            </div>
          )}

          {/* Preview Info */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600">
              {language === "ar"
                ? `سيتم إنشاء ${getPreviewCount() - 1} نسخة إضافية`
                : `Will create ${getPreviewCount() - 1} additional copies`}
            </p>
          </div>

          {/* Apply Button */}
          <Button
            onClick={applyRepeat}
            disabled={applying || !selectedLayer}
            className="w-full"
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "ar" ? "جارٍ التكرار..." : "Repeating..."}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                {language === "ar" ? "تطبيق التكرار" : "Apply Repeat"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
