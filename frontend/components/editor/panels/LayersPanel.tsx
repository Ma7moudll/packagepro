"use client"

import { useDesignStore } from "@/lib/editor/state/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Lock, Unlock, GripVertical, Trash2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export function LayersPanel() {
  const { language } = useLanguage()
  const layers = useDesignStore((s) => s.layers)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds)
  const updateLayer = useDesignStore((s) => s.updateLayer)
  const removeLayer = useDesignStore((s) => s.removeLayer)
  const setSelectedLayers = useDesignStore((s) => s.setSelectedLayers)
  const reorderLayers = useDesignStore((s) => s.reorderLayers)

  const faceLayers = layers
    .filter((l) => l.faceId === selectedFace)
    .sort((a, b) => {
      const aIndex = layers.indexOf(a)
      const bIndex = layers.indexOf(b)
      return bIndex - aIndex // Reverse order (top layer first)
    })

  const handleToggleVisibility = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId)
    if (layer) {
      updateLayer(layerId, (l) => ({ ...l, visible: !l.visible }))
    }
  }

  const handleToggleLock = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId)
    if (layer) {
      updateLayer(layerId, (l) => ({ ...l, locked: !l.locked }))
    }
  }

  const handleDelete = (layerId: string) => {
    removeLayer(layerId)
    if (selectedLayerIds.includes(layerId)) {
      setSelectedLayers(selectedLayerIds.filter((id) => id !== layerId))
    }
  }

  const handleRename = (layerId: string, newName: string) => {
    updateLayer(layerId, (l) => ({ ...l, name: newName }))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-700">
          {language === "ar" ? "الطبقات" : "Layers"} ({faceLayers.length})
        </h4>
      </div>
      {faceLayers.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          {language === "ar" ? "لا توجد طبقات" : "No layers"}
        </p>
      ) : (
        <div className="space-y-1">
          {faceLayers.map((layer) => (
            <div
              key={layer.id}
              className={`flex items-center gap-2 p-2 rounded border transition-colors cursor-pointer ${
                selectedLayerIds.includes(layer.id)
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
              onClick={() => {
                if (!layer.locked) {
                  setSelectedLayers([layer.id])
                }
              }}
            >
              <GripVertical className="h-4 w-4 text-slate-400 shrink-0" />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleVisibility(layer.id)
                }}
              >
                {layer.visible ? (
                  <Eye className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3 text-slate-400" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleLock(layer.id)
                }}
              >
                {layer.locked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3 text-slate-400" />
                )}
              </Button>
              <Input
                value={layer.name}
                onChange={(e) => handleRename(layer.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-xs h-7 px-2"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(layer.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

