"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Wand2,
  Image as ImageIcon,
  Palette,
  Type,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { removeBackground } from "@/lib/editor/services/ai-background-removal"
import { upscaleImage } from "@/lib/editor/services/ai-image-upscaling"
import { generateColorPaletteFromImage, generatePaletteFromColor } from "@/lib/editor/services/ai-color-palette"
import { getFontPairings } from "@/lib/editor/services/ai-font-pairing"
import { checkDesignCompliance } from "@/lib/editor/services/ai-compliance-checker"
import { useDesignStore } from "@/lib/editor/state/store"

export function AIToolsPanel() {
  const { language } = useLanguage()
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const layers = useDesignStore((s) => s.layers)
  const model = useDesignStore((s) => s.model)

  const handleRemoveBackground = async (file: File) => {
    setProcessing(true)
    setResult(null)
    try {
      const result = await removeBackground(file)
      setResult(result)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setProcessing(false)
    }
  }

  const handleUpscale = async (file: File, scale: 2 | 4 | 8) => {
    setProcessing(true)
    setResult(null)
    try {
      const result = await upscaleImage(file, scale)
      setResult(result)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setProcessing(false)
    }
  }

  const handleGeneratePalette = async (file: File | null, color?: string) => {
    setProcessing(true)
    setResult(null)
    try {
      let palette
      if (file) {
        palette = await generateColorPaletteFromImage(file)
      } else if (color) {
        palette = generatePaletteFromColor(color)
      } else {
        throw new Error("No image or color provided")
      }
      setResult(palette)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setProcessing(false)
    }
  }

  const handleCheckCompliance = () => {
    setProcessing(true)
    setResult(null)
    try {
      const report = checkDesignCompliance(layers, model.faces, model.dimensions)
      setResult(report)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-semibold">
          {language === "ar" ? "أدوات الذكاء الاصطناعي" : "AI Tools"}
        </h3>
      </div>

      <Tabs defaultValue="background" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="background" className="text-xs">
            {language === "ar" ? "خلفية" : "Background"}
          </TabsTrigger>
          <TabsTrigger value="upscale" className="text-xs">
            {language === "ar" ? "تكبير" : "Upscale"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="background" className="space-y-3 mt-3">
          <div>
            <Label className="text-xs mb-2 block">
              {language === "ar" ? "إزالة الخلفية" : "Remove Background"}
            </Label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="bg-remove-input"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleRemoveBackground(file)
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => document.getElementById("bg-remove-input")?.click()}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {language === "ar" ? "إزالة الخلفية" : "Remove Background"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="upscale" className="space-y-3 mt-3">
          <div>
            <Label className="text-xs mb-2 block">
              {language === "ar" ? "تكبير الصورة" : "Upscale Image"}
            </Label>
            <Select
              defaultValue="2"
              onValueChange={(value) => {
                const input = document.createElement("input")
                input.type = "file"
                input.accept = "image/*"
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement
                  const file = target.files?.[0]
                  if (file) handleUpscale(file, parseInt(value) as 2 | 4 | 8)
                }
                input.click()
              }}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Select scale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
                <SelectItem value="8">8x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-3 pt-3 border-t">
        <div>
          <Label className="text-xs mb-2 block">
            {language === "ar" ? "لوحة الألوان" : "Color Palette"}
          </Label>
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="palette-image-input"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleGeneratePalette(file)
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => document.getElementById("palette-image-input")?.click()}
              disabled={processing}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              {language === "ar" ? "من صورة" : "From Image"}
            </Button>
            <input
              type="color"
              className="w-12 h-10 rounded border"
              onChange={(e) => handleGeneratePalette(null, e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-2 block">
            {language === "ar" ? "اقتراحات الخطوط" : "Font Pairings"}
          </Label>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const pairings = getFontPairings(undefined, 5)
              setResult({ pairings })
            }}
          >
            <Type className="h-4 w-4 mr-2" />
            {language === "ar" ? "عرض الاقتراحات" : "Show Suggestions"}
          </Button>
        </div>

        <div>
          <Label className="text-xs mb-2 block">
            {language === "ar" ? "فحص الامتثال" : "Compliance Check"}
          </Label>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleCheckCompliance}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {language === "ar" ? "فحص التصميم" : "Check Design"}
          </Button>
        </div>
      </div>

      {result && (
        <div className="mt-4 p-3 rounded border bg-slate-50 text-xs">
          {result.error ? (
            <p className="text-red-600">{result.error}</p>
          ) : result.pairings ? (
            <div className="space-y-2">
              <p className="font-semibold">Font Pairings:</p>
              {result.pairings.map((pair: any, i: number) => (
                <div key={i} className="p-2 bg-white rounded">
                  <p className="font-medium">{pair.heading} / {pair.body}</p>
                  <p className="text-slate-500 text-[10px]">{pair.description}</p>
                </div>
              ))}
            </div>
          ) : result.colors ? (
            <div className="space-y-2">
              <p className="font-semibold">Color Palette:</p>
              <div className="flex gap-1 flex-wrap">
                {result.colors.map((color: string, i: number) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          ) : result.score !== undefined ? (
            <div className="space-y-2">
              <p className="font-semibold">Compliance Score: {result.score}%</p>
              <p>Status: {result.overall}</p>
              <p>Passed: {result.summary.passed}</p>
              <p>Warnings: {result.summary.warnings}</p>
              <p>Errors: {result.summary.errors}</p>
            </div>
          ) : (
            <p>{JSON.stringify(result, null, 2)}</p>
          )}
        </div>
      )}
    </div>
  )
}

