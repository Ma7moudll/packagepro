"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Trash2, Save, Eye, EyeOff } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { EmbossingDebossing } from "@/lib/printing/types"
import { nanoid } from "nanoid"

interface EmbossingPreviewProps {
  width?: number
  height?: number
  onSave?: (effects: EmbossingDebossing[]) => void
}

export function EmbossingPreview({
  width = 800,
  height = 600,
  onSave,
}: EmbossingPreviewProps) {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [effects, setEffects] = useState<EmbossingDebossing[]>([])
  const [selectedEffect, setSelectedEffect] = useState<EmbossingDebossing | null>(null)
  const [effectType, setEffectType] = useState<"emboss" | "deboss">("emboss")
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

      // Draw all effects with 3D simulation
      effects.forEach((effect) => {
        if (!effect.preview) return

        const coords = effect.area.coordinates
        if (coords.length < 2) return

        // Draw shadow/highlight for 3D effect
        const isEmboss = effect.type === "emboss"
        const depth = effect.depth

        // Shadow
        ctx.fillStyle = isEmboss ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)"
        ctx.shadowBlur = depth * 2
        ctx.shadowOffsetX = isEmboss ? depth : -depth
        ctx.shadowOffsetY = isEmboss ? depth : -depth

        if (effect.area.type === "rectangle") {
          const x = Math.min(coords[0].x, coords[1].x)
          const y = Math.min(coords[0].y, coords[1].y)
          const w = Math.abs(coords[1].x - coords[0].x)
          const h = Math.abs(coords[1].y - coords[0].y)
          ctx.fillRect(x, y, w, h)
        } else if (effect.area.type === "circle") {
          const centerX = coords[0].x
          const centerY = coords[0].y
          const radius = Math.sqrt(
            Math.pow(coords[1].x - centerX, 2) + Math.pow(coords[1].y - centerY, 2)
          )
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
          ctx.fill()
        }

        // Reset shadow
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        // Draw main shape with gradient
        const gradient = ctx.createLinearGradient(
          coords[0].x,
          coords[0].y,
          coords[1].x || coords[0].x,
          coords[1].y || coords[0].y
        )

        if (isEmboss) {
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.6)")
          gradient.addColorStop(1, "rgba(200, 200, 200, 0.4)")
        } else {
          gradient.addColorStop(0, "rgba(100, 100, 100, 0.4)")
          gradient.addColorStop(1, "rgba(150, 150, 150, 0.6)")
        }

        ctx.fillStyle = gradient

        if (effect.area.type === "rectangle") {
          const x = Math.min(coords[0].x, coords[1].x)
          const y = Math.min(coords[0].y, coords[1].y)
          const w = Math.abs(coords[1].x - coords[0].x)
          const h = Math.abs(coords[1].y - coords[0].y)
          ctx.fillRect(x, y, w, h)
        } else if (effect.area.type === "circle") {
          const centerX = coords[0].x
          const centerY = coords[0].y
          const radius = Math.sqrt(
            Math.pow(coords[1].x - centerX, 2) + Math.pow(coords[1].y - centerY, 2)
          )
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
          ctx.fill()
        }
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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const effect: EmbossingDebossing = {
      id: nanoid(),
      type: effectType,
      area: {
        type: "rectangle",
        coordinates: [{ x, y }, { x, y }],
      },
      depth: 2,
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
          {language === "ar" ? "معاينة النقش" : "Embossing / Debossing Preview"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>
              {language === "ar" ? "نوع النقش" : "Effect Type"}
            </Label>
            <Select
              value={effectType}
              onValueChange={(v) => setEffectType(v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emboss">
                  {language === "ar" ? "نقش بارز" : "Emboss"}
                </SelectItem>
                <SelectItem value="deboss">
                  {language === "ar" ? "نقش غائر" : "Deboss"}
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
              {language === "ar" ? "العمق" : "Depth"}: {selectedEffect.depth}mm
            </Label>
            <Slider
              value={[selectedEffect.depth]}
              onValueChange={([value]) => {
                const updated = { ...selectedEffect, depth: value }
                setSelectedEffect(updated)
                setEffects(
                  effects.map((eff) => (eff.id === selectedEffect.id ? updated : eff))
                )
              }}
              min={0.5}
              max={5}
              step={0.5}
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
            ? "انقر واسحب لرسم منطقة النقش"
            : "Click and drag to draw embossing area"}
        </p>
      </CardContent>
    </Card>
  )
}

