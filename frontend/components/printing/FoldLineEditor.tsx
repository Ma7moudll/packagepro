"use client"

import { useState, useRef, useEffect } from "react"
import { FoldLineEditor } from "@/lib/printing/fold-line-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Trash2, Save, Download } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

interface FoldLineEditorProps {
  width?: number
  height?: number
  onSave?: (lines: any[]) => void
}

export function FoldLineEditorComponent({
  width = 800,
  height = 600,
  onSave,
}: FoldLineEditorProps) {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editorRef = useRef<FoldLineEditor>(new FoldLineEditor())
  const [lineType, setLineType] = useState<"fold" | "mountain" | "valley">("fold")
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
        ctx.strokeStyle = line.color
        ctx.lineWidth = line.thickness
        ctx.setLineDash(
          line.type === "fold"
            ? [5, 5]
            : line.type === "mountain"
              ? [10, 5, 2, 5]
              : [2, 5]
        )

        ctx.beginPath()
        ctx.moveTo(line.start.x, line.start.y)
        ctx.lineTo(line.end.x, line.end.y)
        ctx.stroke()

        // Draw arrow for direction
        const angle = Math.atan2(
          line.end.y - line.start.y,
          line.end.x - line.start.x
        )
        const arrowLength = 10
        const arrowAngle = Math.PI / 6

        ctx.beginPath()
        ctx.moveTo(line.end.x, line.end.y)
        ctx.lineTo(
          line.end.x - arrowLength * Math.cos(angle - arrowAngle),
          line.end.y - arrowLength * Math.sin(angle - arrowAngle)
        )
        ctx.moveTo(line.end.x, line.end.y)
        ctx.lineTo(
          line.end.x - arrowLength * Math.cos(angle + arrowAngle),
          line.end.y - arrowLength * Math.sin(angle + arrowAngle)
        )
        ctx.stroke()
      })

      // Highlight selected line
      if (selectedLine) {
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = selectedLine.thickness + 2
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(selectedLine.start.x, selectedLine.start.y)
        ctx.lineTo(selectedLine.end.x, selectedLine.end.y)
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

    editorRef.current.updateEndPoint({ x, y })
    setSelectedLine(editorRef.current.getSelectedLine())
  }

  const handleMouseUp = () => {
    if (!isDrawing) return

    editorRef.current.finishDrawing()
    setIsDrawing(false)
    setSelectedLine(editorRef.current.getSelectedLine())
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
    a.download = "fold-lines.svg"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "محرر خطوط الطي" : "Fold Line Editor"}
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
                  <SelectItem value="fold">
                    {language === "ar" ? "طي" : "Fold"}
                  </SelectItem>
                  <SelectItem value="mountain">
                    {language === "ar" ? "طي جبلي" : "Mountain Fold"}
                  </SelectItem>
                  <SelectItem value="valley">
                    {language === "ar" ? "طي وادي" : "Valley Fold"}
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
            />
          </div>

          <p className="text-sm text-slate-500">
            {language === "ar"
              ? "انقر واسحب لرسم خط الطي"
              : "Click and drag to draw fold line"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

