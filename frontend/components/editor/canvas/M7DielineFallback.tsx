"use client"

// M7DielineFallback — FROZEN M7 compatibility path for blueprint-absent products.
//
// M8-D: DielineCanvas (the migrated dieline UI) renders through this legacy
// delegate whenever the store has NO canonical `DielineBlueprint` (product.dieline).
// It is preserved VERBATIM from the M7 generator-based surface so non-blueprint
// products (SKU mailer flows, `custom-shipping-box`, etc.) keep the exact M7
// rendering they shipped with. It is the ONLY living consumer of
// `generateDieline`; the `0.5` display scale and px geometry it computes live
// exclusively here, never in the canonical M8-D path (DielineView/DielineCanvas).

import { useMemo, useRef, useEffect, useState } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { generateDieline, DielineConfig, DielineFace } from "@/lib/editor/utils/dieline-generator"
import { Button } from "@/components/ui/button"
import { Download, ZoomIn, ZoomOut, Move } from "lucide-react"

export function M7DielineFallback() {
  const { language } = useLanguage()
  const model = useDesignStore((s) => s.model)
  const canvas = useDesignStore((s) => s.canvas)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)
  const setSelectedFace = useDesignStore((s) => s.setSelectedFace)

  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  // Generate dieline configuration
  const dieline = useMemo<DielineConfig>(() => {
    return generateDieline(model.type, model.dimensions)
  }, [model.type, model.dimensions])

  // Center the view on load
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth
      const containerHeight = containerRef.current.clientHeight
      const scale = Math.min(
        (containerWidth - 100) / dieline.width,
        (containerHeight - 100) / dieline.height
      )
      setZoom(Math.min(scale, 1))
      setPan({
        x: (containerWidth - dieline.width * scale) / 2,
        y: (containerHeight - dieline.height * scale) / 2,
      })
    }
  }, [dieline])

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.25, Math.min(2, prev + delta)))
  }

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.ctrlKey) {
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x
      const dy = e.clientY - lastPanPoint.y
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Export as SVG
  const handleExport = () => {
    const svg = generateSVG(dieline, canvas.backgroundColor)
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dieline-${model.type}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            {language === "ar" ? "عرض المخطط المسطح" : "Dieline View"}
          </span>
          <span className="text-xs text-slate-500">
            ({dieline.width.toFixed(0)} x {dieline.height.toFixed(0)} mm)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-600 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            {language === "ar" ? "تصدير" : "Export SVG"}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => handleZoom(e.deltaY > 0 ? -0.05 : 0.05)}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left",
            width: dieline.width,
            height: dieline.height,
            position: "relative",
          }}
        >
          {/* Background */}
          <div
            className="absolute inset-0 bg-white shadow-lg"
            style={{ width: dieline.width, height: dieline.height }}
          />

          {/* Faces */}
          {dieline.faces.map((face, index) => (
            <DielineFaceElement
              key={`${face.id}-${index}`}
              face={face}
              isSelected={face.id === selectedFace}
              onClick={() => !face.isFlap && setSelectedFace(face.id)}
              backgroundColor={canvas.backgroundColor}
            />
          ))}

          {/* Fold Lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={dieline.width}
            height={dieline.height}
          >
            {dieline.foldLines.map((line, index) => (
              <line
                key={`fold-${index}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
            ))}
            {dieline.cutLines.map((line, index) => (
              <line
                key={`cut-${index}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#1e293b"
                strokeWidth="1"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 px-4 py-2 bg-white border-t">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-slate-400" />
          <span className="text-xs text-slate-600">
            {language === "ar" ? "خط الطي" : "Fold Line"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-slate-800" />
          <span className="text-xs text-slate-600">
            {language === "ar" ? "خط القطع" : "Cut Line"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-200 border border-slate-300 rounded" />
          <span className="text-xs text-slate-600">
            {language === "ar" ? "فلاب / لسان" : "Flap / Tab"}
          </span>
        </div>
      </div>
    </div>
  )
}

// Individual face element
function DielineFaceElement({
  face,
  isSelected,
  onClick,
  backgroundColor,
}: {
  face: DielineFace
  isSelected: boolean
  onClick: () => void
  backgroundColor: string
}) {
  return (
    <div
      onClick={onClick}
      className={`
        absolute border transition-all
        ${face.isFlap ? "cursor-default" : "cursor-pointer hover:ring-2 hover:ring-blue-400"}
        ${isSelected ? "ring-2 ring-blue-500 z-10" : ""}
      `}
      style={{
        left: face.x,
        top: face.y,
        width: face.width,
        height: face.height,
        backgroundColor: face.isFlap ? face.color : backgroundColor,
        borderColor: isSelected ? "#3b82f6" : "#cbd5e1",
      }}
    >
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`
            text-[9px] font-medium px-1 py-0.5 rounded bg-white/80
            ${face.isFlap ? "text-slate-400" : "text-slate-600"}
          `}
        >
          {face.label}
        </span>
      </div>

      {/* Dimensions */}
      {!face.isFlap && face.width > 40 && face.height > 40 && (
        <>
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-400">
            {face.width.toFixed(0)}
          </span>
          <span
            className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg) translateX(50%)" }}
          >
            {face.height.toFixed(0)}
          </span>
        </>
      )}
    </div>
  )
}

// Generate SVG string for export
function generateSVG(dieline: DielineConfig, backgroundColor: string): string {
  const faces = dieline.faces.map((face) => `
    <rect
      x="${face.x}"
      y="${face.y}"
      width="${face.width}"
      height="${face.height}"
      fill="${face.isFlap ? face.color : backgroundColor}"
      stroke="#cbd5e1"
      stroke-width="1"
    />
    <text
      x="${face.x + face.width / 2}"
      y="${face.y + face.height / 2}"
      text-anchor="middle"
      dominant-baseline="middle"
      font-size="8"
      fill="${face.isFlap ? "#94a3b8" : "#475569"}"
    >
      ${face.label}
    </text>
  `).join("")

  const foldLines = dieline.foldLines.map((line) => `
    <line
      x1="${line.x1}" y1="${line.y1}"
      x2="${line.x2}" y2="${line.y2}"
      stroke="#94a3b8"
      stroke-width="1"
      stroke-dasharray="4 2"
    />
  `).join("")

  const cutLines = dieline.cutLines.map((line) => `
    <line
      x1="${line.x1}" y1="${line.y1}"
      x2="${line.x2}" y2="${line.y2}"
      stroke="#1e293b"
      stroke-width="1"
    />
  `).join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${dieline.width}mm"
  height="${dieline.height}mm"
  viewBox="0 0 ${dieline.width} ${dieline.height}"
>
  <rect width="100%" height="100%" fill="white"/>
  ${faces}
  ${foldLines}
  ${cutLines}
</svg>`
}