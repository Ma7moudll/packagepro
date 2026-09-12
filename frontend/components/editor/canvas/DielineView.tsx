"use client"

// DielineView — canonical rendered dieline canvas over M8-C geometry (M8-D).
//
// Pure PRESENTATION: it maps a resolved `DielineGeometry` (supplied by the
// single resolution point, `resolveDieline`) to visual primitives:
//   - panels → absolutely-positioned divs (fill + label + dims + selection)
//   - cutPaths/foldPaths/scorePaths/gluePaths/perfPaths → svg <line>s, and
//     geometry.outline → a closed <polyline> (ALL coordinates come from the
//     canonical geometry arrays — nothing is recomputed here)
//   - export → the canonical M8-C `serializeSVG(geometry)` output
//
// It contains NO geometry model and NO resolution calls (no buildDieline /
// resolveDieline / generateDieline / edgePoints / lineKey). Blueprint-absent
// products (count: `M7DielineFallback`) keep the frozen M7 rendering.

import { useRef, useEffect, useState } from "react"
import { useLanguage } from "@/providers/language-provider"
import { flatBounds } from "@/lib/editor/geometry/dieline"
import { serializeSVG } from "@/lib/editor/services/dieline-service"
import { M7DielineFallback } from "@/components/editor/canvas/M7DielineFallback"
import type { DielineResolution } from "@/lib/editor/geometry/resolve-dieline"
import type { FaceId, DielinePath } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Download, ZoomIn, ZoomOut, Move } from "lucide-react"

const FACE_LABEL: Record<FaceId, string> = {
  front: "Front",
  back: "Back",
  left: "Left",
  right: "Right",
  top: "Top",
  bottom: "Bottom",
  inside_front: "Inside Front",
  inside_back: "Inside Back",
  inside_left: "Inside Left",
  inside_right: "Inside Right",
  inside_top: "Inside Top",
  inside_bottom: "Inside Bottom",
}

interface DielineViewProps {
  /** Canonical resolution produced at the single resolution point. */
  resolution?: DielineResolution
  backgroundColor: string
  selectedFace: FaceId | null
  onSelectFace: (faceId: FaceId) => void
}

export function DielineView({
  resolution,
  backgroundColor,
  selectedFace,
  onSelectFace,
}: DielineViewProps) {
  const { language } = useLanguage()

  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  const geometry = resolution?.ok ? resolution.geometry : undefined
  const bounds = geometry ? flatBounds(geometry) : undefined
  const sheetW = bounds ? bounds.x1 - bounds.x0 : 0
  const sheetH = bounds ? bounds.y1 - bounds.y0 : 0

  // Center the view on the sheet (mm dims rendered 1:1).
  useEffect(() => {
    if (!geometry || !containerRef.current) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const scale = Math.min((cw - 100) / sheetW, (ch - 100) / sheetH)
    setZoom(Math.min(scale, 1))
    setPan({ x: (cw - sheetW * scale) / 2, y: (ch - sheetH * scale) / 2 })
  }, [geometry, sheetW, sheetH])

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.25, Math.min(2, prev + delta)))
  }

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

  const handleExport = () => {
    if (!geometry) return
    const svg = serializeSVG(geometry)
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dieline-${geometry.boxType}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Blueprint-absent path — exact M7 rendering (frozen legacy delegate).
  if (!geometry) {
    return <M7DielineFallback />
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
            ({sheetW.toFixed(0)} x {sheetH.toFixed(0)} mm)
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
            width: sheetW,
            height: sheetH,
            position: "relative",
          }}
        >
          {/* Sheet background */}
          <div
            className="absolute shadow-lg bg-white"
            style={{
              left: bounds?.x0,
              top: bounds?.y0,
              width: sheetW,
              height: sheetH,
            }}
          />

          {/* Panels — mapped 1:1 from geometry.panels (canonical positions/sizes). */}
          {Object.entries(geometry.panels).map(([faceId, panel]) => {
            const isFlap = faceId.startsWith("inside_")
            const id = faceId as FaceId
            return (
              <div
                key={faceId}
                data-face-id={faceId}
                onClick={() => !isFlap && onSelectFace(id)}
                className={`
                  absolute border transition-all
                  ${isFlap ? "cursor-default" : "cursor-pointer hover:ring-2 hover:ring-blue-400"}
                  ${selectedFace === id && !isFlap ? "ring-2 ring-blue-500 z-10" : ""}
                `}
                style={{
                  left: panel.x,
                  top: panel.y,
                  width: panel.w,
                  height: panel.h,
                  backgroundColor: isFlap ? "#e2e8f0" : backgroundColor,
                  borderColor: selectedFace === id ? "#3b82f6" : "#cbd5e1",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`
                      text-[9px] font-medium px-1 py-0.5 rounded bg-white/80
                      ${isFlap ? "text-slate-400" : "text-slate-600"}
                    `}
                  >
                    {FACE_LABEL[id] ?? id}
                  </span>
                </div>
                {!isFlap && panel.w > 40 && panel.h > 40 && (
                  <>
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-400">
                      {panel.w.toFixed(0)}
                    </span>
                    <span
                      className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-slate-400"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg) translateX(50%)" }}
                    >
                      {panel.h.toFixed(0)}
                    </span>
                  </>
                )}
              </div>
            )
          })}

          {/* Line overlay — cut/fold/score/glue/perf + closed outline, mapped from
              the canonical path arrays (mm). No geometry is computed here. */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={sheetW}
            height={sheetH}
            style={{ left: bounds?.x0, top: bounds?.y0 }}
          >
            {geometry.cutPaths.map((p) => (
              <LineElement key={p.id} path={p} stroke="#1e293b" strokeWidth="1" dash="none" />
            ))}
            {geometry.foldPaths.map((p) => (
              <LineElement key={p.id} path={p} stroke="#94a3b8" strokeWidth="1" dash="4 2" />
            ))}
            {geometry.scorePaths.map((p) => (
              <LineElement key={p.id} path={p} stroke="#b0bec5" strokeWidth="0.5" dash="2 2" />
            ))}
            {geometry.gluePaths.map((p) => (
              <LineElement key={p.id} path={p} stroke="#0a7a7a" strokeWidth="1" dash="6 2" />
            ))}
            {geometry.perfPaths.map((p) => (
              <LineElement key={p.id} path={p} stroke="#990099" strokeWidth="1" dash="1 2" />
            ))}
            {geometry.outline.map((p) => (
              <polyline
                key={p.id}
                points={p.points.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                stroke="#000000"
                strokeWidth="1"
                fill="none"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 px-4 py-2 bg-white border-t">
        <LegendItem
          swatch={<div className="w-8 h-0.5 bg-slate-800" />}
          label={language === "ar" ? "خط القطع" : "Cut"}
        />
        <LegendItem
          swatch={<div className="w-8 h-0.5 border-t-2 border-dashed border-slate-400" />}
          label={language === "ar" ? "خط الطي" : "Fold"}
        />
        <LegendItem
          swatch={<div className="w-8 h-0.5 border-t border-dashed border-slate-400" />}
          label={language === "ar" ? "خدش" : "Score"}
        />
        <LegendItem
          swatch={<div className="w-8 h-0.5 border-t-2 border-dashed border-teal-700" />}
          label={language === "ar" ? "لصق" : "Glue"}
        />
        <LegendItem
          swatch={<div className="w-8 h-0.5 border-t border-dashed border-fuchsia-700" />}
          label={language === "ar" ? "تمزيق" : "Perf"}
        />
        <LegendItem
          swatch={<div className="w-4 h-4 bg-slate-200 border border-slate-300 rounded" />}
          label={language === "ar" ? "فلاب / لسان" : "Flap / Tab"}
        />
      </div>
    </div>
  )
}

function LineElement({
  path,
  stroke,
  strokeWidth,
  dash,
}: {
  path: DielinePath
  stroke: string
  strokeWidth: string
  dash: string
}) {
  const [p0, p1] = path.points
  return (
    <line
      x1={p0.x}
      y1={p0.y}
      x2={p1.x}
      y2={p1.y}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
    />
  )
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {swatch}
      <span className="text-xs text-slate-600">{label}</span>
    </div>
  )
}