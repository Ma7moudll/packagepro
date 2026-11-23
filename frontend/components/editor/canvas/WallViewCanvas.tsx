"use client"

import { useRef, useState, useEffect } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { unsupportedSheetArtwork, unsupportedArtworkOutputMessage } from "@/lib/editor/print-coverage"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  ZoomIn,
  ZoomOut,
  Grid,
  RotateCcw,
  Download,
} from "lucide-react"

interface WallViewSettings {
  columns: number
  rows: number
  gap: number
  rotation: number
  offset: boolean
}

export function WallViewCanvas() {
  const { language } = useLanguage()
  const canvas = useDesignStore((s) => s.canvas)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [zoom, setZoom] = useState(0.5)
  const [settings, setSettings] = useState<WallViewSettings>({
    columns: 4,
    rows: 3,
    gap: 0,
    rotation: 0,
    offset: false,
  })

  // Get the design from the canvas (simplified - would normally use fabric.js export)
  const [designImage, setDesignImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    // Create a placeholder design pattern based on canvas background
    const img = new Image()
    img.src = createPatternSVG(canvas.backgroundColor, canvas.width, canvas.height)
    img.onload = () => setDesignImage(img)
  }, [canvas])

  // Draw wall view
  useEffect(() => {
    if (!canvasRef.current || !designImage) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    const { columns, rows, gap, rotation, offset } = settings
    const tileWidth = canvas.width * zoom
    const tileHeight = canvas.height * zoom
    const totalWidth = columns * (tileWidth + gap) - gap
    const totalHeight = rows * (tileHeight + gap) - gap

    // Set canvas size
    canvasRef.current.width = totalWidth
    canvasRef.current.height = totalHeight

    // Clear canvas
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, totalWidth, totalHeight)

    // Draw tiles
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const offsetX = offset && row % 2 === 1 ? (tileWidth + gap) / 2 : 0
        const x = col * (tileWidth + gap) + offsetX
        const y = row * (tileHeight + gap)

        ctx.save()

        // Apply rotation around tile center
        if (rotation !== 0) {
          ctx.translate(x + tileWidth / 2, y + tileHeight / 2)
          ctx.rotate((rotation * Math.PI) / 180)
          ctx.translate(-tileWidth / 2, -tileHeight / 2)
          ctx.drawImage(designImage, 0, 0, tileWidth, tileHeight)
        } else {
          ctx.drawImage(designImage, x, y, tileWidth, tileHeight)
        }

        ctx.restore()

        // Draw tile border
        ctx.strokeStyle = "#e2e8f0"
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, tileWidth, tileHeight)
      }
    }
  }, [designImage, settings, zoom, canvas])

  // Handle export
  const [outputNotice, setOutputNotice] = useState("")
  const handleExport = () => {
    const live = useDesignStore.getState()
    const unsupported = unsupportedSheetArtwork(live.model.faces, live.layers, live.model.type)
    if (unsupported) {
      setOutputNotice(`Export blocked: ${unsupportedArtworkOutputMessage(unsupported)}`)
      return
    }
    setOutputNotice("")
    if (!canvasRef.current) return
    const link = document.createElement("a")
    link.download = "wall-view.png"
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  // Reset settings
  const handleReset = () => {
    setSettings({
      columns: 4,
      rows: 3,
      gap: 0,
      rotation: 0,
      offset: false,
    })
    setZoom(0.5)
  }

  return (
    <div className="flex h-full bg-slate-100">
      {outputNotice && <p role="alert" className="text-xs text-red-700 p-2">{outputNotice}</p>}
      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        <div className="flex items-center justify-center min-h-full">
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
          />
        </div>
      </div>

      {/* Controls Sidebar */}
      <div className="w-64 bg-white border-l p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            {language === "ar" ? "عرض الجدار" : "Wall View"}
          </h3>
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-500">
              {language === "ar" ? "التكبير" : "Zoom"}
            </Label>
            <span className="text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}>
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={0.1}
              max={1}
              step={0.05}
              className="flex-1"
            />
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(1, z + 0.1))}>
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Columns */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-500">
              {language === "ar" ? "الأعمدة" : "Columns"}
            </Label>
            <span className="text-xs text-slate-500">{settings.columns}</span>
          </div>
          <Slider
            value={[settings.columns]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, columns: v }))}
            min={1}
            max={8}
            step={1}
          />
        </div>

        {/* Rows */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-500">
              {language === "ar" ? "الصفوف" : "Rows"}
            </Label>
            <span className="text-xs text-slate-500">{settings.rows}</span>
          </div>
          <Slider
            value={[settings.rows]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, rows: v }))}
            min={1}
            max={6}
            step={1}
          />
        </div>

        {/* Gap */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-500">
              {language === "ar" ? "المسافة" : "Gap"}
            </Label>
            <span className="text-xs text-slate-500">{settings.gap}px</span>
          </div>
          <Slider
            value={[settings.gap]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, gap: v }))}
            min={0}
            max={20}
            step={1}
          />
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-500">
              {language === "ar" ? "التدوير" : "Rotation"}
            </Label>
            <span className="text-xs text-slate-500">{settings.rotation}°</span>
          </div>
          <Slider
            value={[settings.rotation]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, rotation: v }))}
            min={0}
            max={360}
            step={15}
          />
        </div>

        {/* Offset Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-slate-500">
            {language === "ar" ? "إزاحة الصفوف" : "Offset rows"}
          </Label>
          <Button
            variant={settings.offset ? "secondary" : "outline"}
            size="sm"
            className="h-7"
            onClick={() => setSettings((s) => ({ ...s, offset: !s.offset }))}
          >
            <Grid className="h-3 w-3 mr-1" />
            {settings.offset
              ? language === "ar"
                ? "مفعّل"
                : "On"
              : language === "ar"
              ? "معطّل"
              : "Off"}
          </Button>
        </div>

        {/* Export Button */}
        <Button onClick={handleExport} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          {language === "ar" ? "تصدير PNG" : "Export PNG"}
        </Button>
      </div>
    </div>
  )
}

// Create a simple pattern SVG to represent the design
function createPatternSVG(bgColor: string, width: number, height: number): string {
  // Create a pattern that shows the design would look like
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <rect x="10%" y="10%" width="80%" height="80%" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="#94a3b8">
        Design Area
      </text>
      <circle cx="50%" cy="30%" r="8%" fill="${bgColor === '#ffffff' ? '#f1f5f9' : 'rgba(255,255,255,0.2)'}"/>
      <rect x="30%" y="60%" width="40%" height="20%" rx="2" fill="${bgColor === '#ffffff' ? '#f1f5f9' : 'rgba(255,255,255,0.2)'}"/>
    </svg>
  `
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
