"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Trash2, Save, Eye, EyeOff } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { SpotUV } from "@/lib/printing/types"
import { nanoid } from "nanoid"

interface SpotUVSimulatorProps {
  width?: number
  height?: number
  onSave?: (effects: SpotUV[]) => void
}

export function SpotUVSimulator({
  width = 800,
  height = 600,
  onSave,
}: SpotUVSimulatorProps) {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [effects, setEffects] = useState<SpotUV[]>([])
  const [selectedEffect, setSelectedEffect] = useState<SpotUV | null>(null)
  const [effectType, setEffectType] = useState<"spot_uv" | "foil_stamping" | "gloss" | "matte">("spot_uv")
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = "#e5e7eb"
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.strokeRect(0, 0, width, height)

      // Draw all effects
      effects.forEach((effect) => {
        if (!effect.preview) return

        ctx.globalAlpha = effect.opacity
        ctx.fillStyle = getColorForType(effect.type)

        if (effect.area.type === "rectangle") {
          const coords = effect.area.coordinates
          if (coords.length >= 2) {
            const x = Math.min(coords[0].x, coords[1].x)
            const y = Math.min(coords[0].y, coords[1].y)
            const w = Math.abs(coords[1].x - coords[0].x)
            const h = Math.abs(coords[1].y - coords[0].y)
            ctx.fillRect(x, y, w, h)
          }
        } else if (effect.area.type === "circle") {
          const coords = effect.area.coordinates
          if (coords.length >= 2) {
            const centerX = coords[0].x
            const centerY = coords[0].y
            const radius = Math.sqrt(
              Math.pow(coords[1].x - centerX, 2) + Math.pow(coords[1].y - centerY, 2)
            )
            ctx.beginPath()
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
            ctx.fill()
          }
        } else if (effect.area.type === "polygon" || effect.area.type === "path") {
          if (effect.area.coordinates.length >= 3) {
            ctx.beginPath()
            ctx.moveTo(effect.area.coordinates[0].x, effect.area.coordinates[0].y)
            for (let i = 1; i < effect.area.coordinates.length; i++) {
              ctx.lineTo(effect.area.coordinates[i].x, effect.area.coordinates[i].y)
            }
            ctx.closePath()
            ctx.fill()
          }
        }

        ctx.globalAlpha = 1.0
      })

      // Highlight selected effect
      if (selectedEffect) {
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 2
        ctx.setLineDash([])
        const coords = selectedEffect.area.coordinates
        if (coords.length >= 2) {
          if (selectedEffect.area.type === "rectangle") {
            const x = Math.min(coords[0].x, coords[1].x)
            const y = Math.min(coords[0].y, coords[1].y)
            const w = Math.abs(coords[1].x - coords[0].x)
            const h = Math.abs(coords[1].y - coords[0].y)
            ctx.strokeRect(x, y, w, h)
          }
        }
      }
    }

    draw()
  }, [effects, selectedEffect, width, height])

  const getColorForType = (type: string): string => {
    switch (type) {
      case "spot_uv":
        return "rgba(255, 255, 0, 0.3)" // Yellow with transparency
      case "foil_stamping":
        return "rgba(255, 215, 0, 0.5)" // Gold
      case "gloss":
        return "rgba(255, 255, 255, 0.4)" // White with transparency
      case "matte":
        return "rgba(128, 128, 128, 0.3)" // Gray with transparency
      default:
        return "rgba(255, 0, 0, 0.3)"
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const effect: SpotUV = {
      id: nanoid(),
      type: effectType,
      area: {
        type: "rectangle",
        coordinates: [{ x, y }, { x, y }],
      },
      opacity: 0.5,
      preview: true,
    }

    setEffects([...effects, effect])
    setSelectedEffect(effect)
    setStartPoint({ x, y })
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !selectedEffect || !startPoint) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const updatedEffect = {
      ...selectedEffect,
      area: {
        ...selectedEffect.area,
        coordinates: [startPoint, { x, y }],
      },
    }

    setSelectedEffect(updatedEffect)
    setEffects(
      effects.map((eff) => (eff.id === selectedEffect.id ? updatedEffect : eff))
    )
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
    setStartPoint(null)
  }

  const handleDelete = () => {
    if (selectedEffect) {
      setEffects(effects.filter((eff) => eff.id !== selectedEffect.id))
      setSelectedEffect(null)
    }
  }

  const handleTogglePreview = () => {
    if (selectedEffect) {
      const updated = {
        ...selectedEffect,
        preview: !selectedEffect.preview,
      }
      setSelectedEffect(updated)
      setEffects(
        effects.map((eff) => (eff.id === selectedEffect.id ? updated : eff))
      )
    }
  }

  const handleSave = () => {
    onSave?.(effects)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === "ar" ? "محاكاة Spot UV / Foil" : "Spot UV / Foil Simulation"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>
              {language === "ar" ? "نوع التأثير" : "Effect Type"}
            </Label>
            <Select
              value={effectType}
              onValueChange={(v) => setEffectType(v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spot_uv">Spot UV</SelectItem>
                <SelectItem value="foil_stamping">
                  {language === "ar" ? "طباعة معدنية" : "Foil Stamping"}
                </SelectItem>
                <SelectItem value="gloss">
                  {language === "ar" ? "لمعان" : "Gloss"}
                </SelectItem>
                <SelectItem value="matte">
                  {language === "ar" ? "مات" : "Matte"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {language === "ar" ? "حفظ" : "Save"}
          </Button>
          {selectedEffect && (
            <>
              <Button variant="outline" onClick={handleTogglePreview}>
                {selectedEffect.preview ? (
                  <EyeOff className="h-4 w-4 mr-2" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                {language === "ar" ? "معاينة" : "Preview"}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                {language === "ar" ? "حذف" : "Delete"}
              </Button>
            </>
          )}
        </div>

        {selectedEffect && (
          <div className="space-y-2">
            <Label>
              {language === "ar" ? "الشفافية" : "Opacity"}: {selectedEffect.opacity}
            </Label>
            <Slider
              value={[selectedEffect.opacity]}
              onValueChange={([value]) => {
                const updated = { ...selectedEffect, opacity: value }
                setSelectedEffect(updated)
                setEffects(
                  effects.map((eff) => (eff.id === selectedEffect.id ? updated : eff))
                )
              }}
              min={0}
              max={1}
              step={0.1}
            />
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>

        <p className="text-sm text-slate-500">
          {language === "ar"
            ? "انقر واسحب لرسم منطقة التأثير"
            : "Click and drag to draw effect area"}
        </p>
      </CardContent>
    </Card>
  )
}

