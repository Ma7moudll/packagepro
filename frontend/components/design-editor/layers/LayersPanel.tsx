"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Lock, Unlock, GripVertical } from "lucide-react"
import { fabric } from "fabric"

interface Layer {
  id: string
  name: string
  type: string
  visible: boolean
  locked: boolean
  opacity: number
  object: fabric.Object
}

interface LayersPanelProps {
  canvas: fabric.Canvas | null
  onLayerSelect?: (layer: Layer) => void
  language?: "ar" | "en"
}

export function LayersPanel({ canvas, onLayerSelect, language = "en" }: LayersPanelProps) {
  const [layers, setLayers] = useState<Layer[]>([])

  if (!canvas) return null

  // Sync layers with canvas objects
  const syncLayers = () => {
    const objects = canvas.getObjects()
    const newLayers: Layer[] = objects.map((obj, idx) => ({
      id: `layer-${idx}`,
      name: obj.type === "text" ? ((obj as fabric.Text).text || '') : `${obj.type} ${idx + 1}`,
      type: obj.type || "unknown",
      visible: obj.visible !== false,
      locked: obj.selectable === false,
      opacity: (obj.opacity || 1) * 100,
      object: obj,
    }))
    setLayers(newLayers)
  }

  const toggleVisibility = (layer: Layer) => {
    layer.object.set("visible", !layer.visible)
    canvas.renderAll()
    syncLayers()
  }

  const toggleLock = (layer: Layer) => {
    layer.object.set("selectable", layer.locked)
    canvas.renderAll()
    syncLayers()
  }

  const selectLayer = (layer: Layer) => {
    canvas.setActiveObject(layer.object)
    canvas.renderAll()
    if (onLayerSelect) onLayerSelect(layer)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold mb-3">
        {language === "ar" ? "الطبقات" : "Layers"}
      </h3>
      <div className="space-y-1">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 cursor-pointer"
            onClick={() => selectLayer(layer)}
          >
            <GripVertical className="h-4 w-4 text-slate-400" />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleVisibility(layer)
              }}
            >
              {layer.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4 text-slate-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleLock(layer)
              }}
            >
              {layer.locked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
            </Button>
            <span className="flex-1 text-sm">{layer.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

