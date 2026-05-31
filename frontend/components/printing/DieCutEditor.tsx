"use client"

import { useState, useRef, useEffect } from "react"
import { DieCutEditor } from "@/lib/printing/die-cut-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Trash2, Save, Download } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

interface DieCutEditorProps {
  width?: number
  height?: number
  onSave?: (lines: any[]) => void
}

export function DieCutEditorComponent({
  width = 800,
  height = 600,
  onSave,
}: DieCutEditorProps) {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editorRef = useRef<DieCutEditor>(new DieCutEditor())
  const [lineType, setLineType] = useState<"cut" | "perforation" | "score">("cut")
  const [selectedLine, setSelectedLine] = useState<any>(null)
  const [isDrawing, setIsDrawing] = useState(false)

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

      // Draw all lines
      const lines = editorRef.current.getLines()
      lines.forEach((line) => {
        if (line.points.length < 2) return

        ctx.strokeStyle = line.color
        ctx.lineWidth = line.thickness
        ctx.setLineDash(
          line.type === "cut"
            ? []
            : line.type === "perforation"
              ? [5, 5]
              : [10, 5]
        )

        ctx.beginPath()
        ctx.moveTo(line.points[0].x, line.points[0].y)
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y)
        }
        if (line.closed) {
          ctx.closePath()
        }
        ctx.stroke()
      })

      // Highlight selected line
      if (selectedLine) {
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = selectedLine.thickness + 2
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(selectedLine.points[0].x, selectedLine.points[0].y)
        for (let i = 1; i < selectedLine.points.length; i++) {
          ctx.lineTo(selectedLine.points[i].x, selectedLine.points[i].y)
        }
        if (selectedLine.closed) {
          ctx.closePath()
        }
        ctx.stroke()
      }
    }

    draw()
  }, [selectedLine, width, height])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    editorRef.current.startDrawing(lineType, { x, y })
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    editorRef.current.addPoint({ x, y })
    const lines = editorRef.current.getLines()
    setSelectedLine(editorRef.current.getSelectedLine())
  }

  const handleMouseUp = () => {
    if (!isDrawing) return

    editorRef.current.finishDrawing(false)
    setIsDrawing(false)
    setSelectedLine(editorRef.current.getSelectedLine())
  }

  const handleDoubleClick = () => {
    if (selectedLine) {
      editorRef.current.updateLine(selectedLine.id, { closed: true })
      setSelectedLine(editorRef.current.getSelectedLine())
    }
  }

  const handleDelete = () => {
    if (selectedLine) {
      editorRef.current.removeLine(selectedLine.id)
      setSelectedLine(null)
    }
  }

  const handleSave = () => {
    const lines = editorRef.current.getLines()
    onSave?.(lines)
  }

  const handleExport = () => {
    const svg = editorRef.current.exportAsSVG()
    const blob = new Blob([svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "die-cut-lines.svg"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "محرر خطوط القطع" : "Die-Cut Line Editor"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>
                {language === "ar" ? "نوع الخط" : "Line Type"}
              </Label>
              <Select
                value={lineType}
                onValueChange={(v) => setLineType(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cut">
                    {language === "ar" ? "قطع" : "Cut"}
                  </SelectItem>
                  <SelectItem value="perforation">
                    {language === "ar" ? "ثقب" : "Perforation"}
                  </SelectItem>
                  <SelectItem value="score">
                    {language === "ar" ? "طوي" : "Score"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {language === "ar" ? "حفظ" : "Save"}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              {language === "ar" ? "تصدير" : "Export"}
            </Button>
            {selectedLine && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                {language === "ar" ? "حذف" : "Delete"}
              </Button>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleDoubleClick}
            />
          </div>

          <p className="text-sm text-slate-500">
            {language === "ar"
              ? "انقر لبدء الرسم، انقر نقراً مزدوجاً لإغلاق الخط"
              : "Click to start drawing, double-click to close line"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

