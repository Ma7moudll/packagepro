"use client"

import { Button } from "@/components/ui/button"
import { useDesignStore } from "@/lib/editor/state/store"
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Package,
  PackageOpen,
  Square,
  Box,
  LayoutPanelLeft,
  LayoutGrid,
} from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { RepeatTool } from "@/components/editor/tools/RepeatTool"
import { cn } from "@/lib/utils"

export function EditorBottomBar() {
  const { language } = useLanguage()
  const layers = useDesignStore((s) => s.layers)
  const selectedIds = useDesignStore((s) => s.selectedLayerIds)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)
  const setSelectedFace = useDesignStore((s) => s.setSelectedFace)
  const model = useDesignStore((s) => s.model)
  const updateLayer = useDesignStore((s) => s.updateLayer)
  const removeLayer = useDesignStore((s) => s.removeLayer)
  const addLayer = useDesignStore((s) => s.addLayer)
  const setSelectedLayers = useDesignStore((s) => s.setSelectedLayers)

  const boxOpenState = useDesignStore((s) => s.ui.boxOpenState)
  const setBoxOpenState = useDesignStore((s) => s.setBoxOpenState)
  const toggleBoxOpen = useDesignStore((s) => s.toggleBoxOpen)
  const viewMode = useDesignStore((s) => s.ui.viewMode)
  const setViewMode = useDesignStore((s) => s.setViewMode)

  const selectedLayers = layers.filter((l) => selectedIds.includes(l.id) && l.faceId === selectedFace)

  const handleAlign = (align: "left" | "center" | "right") => {
    if (selectedLayers.length === 0) return
    const canvasWidth = 800
    selectedLayers.forEach((layer) => {
      let newX = layer.position.x
      if (align === "left") newX = 50
      else if (align === "center") newX = canvasWidth / 2
      else if (align === "right") newX = canvasWidth - 50
      updateLayer(layer.id, (l) => ({ ...l, position: { ...l.position, x: newX } }))
    })
  }

  const handleDuplicate = () => {
    selectedLayers.forEach((layer) => {
      addLayer({
        ...layer,
        name: `${layer.name} Copy`,
        position: { x: layer.position.x + 20, y: layer.position.y + 20 },
      })
    })
  }

  const handleDelete = () => {
    selectedIds.forEach((id) => removeLayer(id))
    setSelectedLayers([])
  }

  const handleLock = () => {
    selectedLayers.forEach((layer) => {
      updateLayer(layer.id, (l) => ({ ...l, locked: !l.locked }))
    })
  }

  const isLocked = selectedLayers.some((l) => l.locked)
  const hasSelection = selectedLayers.length > 0

  // Get visible faces based on print coverage
  const outsideFaces = model.faces.filter(f => !f.id.startsWith("inside_"))
  const insideFaces = model.faces.filter(f => f.id.startsWith("inside_"))
  const isInsideView = selectedFace.startsWith("inside_")
  const currentFaces = isInsideView ? insideFaces : outsideFaces

  return (
    <TooltipProvider>
      <footer className="h-12 bg-white border-t border-slate-200 flex items-center px-3 gap-2">
        {/* View Mode */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 rounded-md",
                  viewMode === "2d" && "bg-white shadow-sm"
                )}
                onClick={() => setViewMode("2d")}
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>2D</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 rounded-md",
                  viewMode === "3d" && "bg-white shadow-sm"
                )}
                onClick={() => setViewMode("3d")}
              >
                <Box className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>3D</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 rounded-md",
                  viewMode === "dieline" && "bg-white shadow-sm"
                )}
                onClick={() => setViewMode("dieline")}
              >
                <LayoutPanelLeft className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{language === "ar" ? "مخطط" : "Dieline"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 rounded-md",
                  viewMode === "wall" && "bg-white shadow-sm"
                )}
                onClick={() => setViewMode("wall")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{language === "ar" ? "جدار" : "Wall"}</TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-slate-200" />

        {/* Box Open/Close - only in 3D mode */}
        {viewMode === "3d" && (
          <>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 px-2 rounded-md text-[10px] font-medium gap-1",
                      boxOpenState > 0.5 && "bg-emerald-500 text-white hover:bg-emerald-600"
                    )}
                    onClick={toggleBoxOpen}
                  >
                    {boxOpenState > 0.5 ? (
                      <>
                        <PackageOpen className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{language === "ar" ? "مفتوح" : "Open"}</span>
                      </>
                    ) : (
                      <>
                        <Package className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{language === "ar" ? "مغلق" : "Closed"}</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {boxOpenState > 0.5
                    ? (language === "ar" ? "إغلاق العبوة" : "Close package")
                    : (language === "ar" ? "فتح العبوة" : "Open package")}
                </TooltipContent>
              </Tooltip>
              
              <div className="w-16 hidden md:block">
                <Slider
                  value={[boxOpenState * 100]}
                  onValueChange={([v]) => setBoxOpenState(v / 100)}
                  min={0}
                  max={100}
                  step={1}
                  className="h-1"
                />
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200" />
          </>
        )}

        {/* Alignment Tools */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-white"
                onClick={() => handleAlign("left")}
                disabled={!hasSelection}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{language === "ar" ? "يسار" : "Left"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-white"
                onClick={() => handleAlign("center")}
                disabled={!hasSelection}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{language === "ar" ? "وسط" : "Center"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-white"
                onClick={() => handleAlign("right")}
                disabled={!hasSelection}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{language === "ar" ? "يمين" : "Right"}</TooltipContent>
          </Tooltip>
        </div>

        {/* Face Switcher - Center */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {/* Inside/Outside Toggle */}
          {(model.printCoverage === "inside" || model.printCoverage === "both") && (
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-3 text-[10px] rounded-md font-medium",
                  !isInsideView && "bg-white shadow-sm text-slate-900"
                )}
                onClick={() => setSelectedFace("front")}
              >
                {language === "ar" ? "خارجي" : "Outside"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-3 text-[10px] rounded-md font-medium",
                  isInsideView && "bg-white shadow-sm text-slate-900"
                )}
                onClick={() => setSelectedFace("inside_front")}
              >
                {language === "ar" ? "داخلي" : "Inside"}
              </Button>
            </div>
          )}

          {/* Face Selection */}
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 p-0.5 rounded-lg shadow-sm">
            {currentFaces.map((face) => (
              <Button
                key={face.id}
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFace(face.id as any)}
                className={cn(
                  "h-7 px-3 text-[10px] rounded-md font-medium",
                  selectedFace === face.id
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "text-slate-500 hover:bg-slate-100"
                )}
              >
                {face.name.replace("Inside ", "")}
              </Button>
            ))}
          </div>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-white"
                onClick={handleDuplicate}
                disabled={!hasSelection}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{language === "ar" ? "نسخ" : "Duplicate"}</TooltipContent>
          </Tooltip>

          <RepeatTool />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 rounded-md",
                  isLocked ? "bg-amber-100 text-amber-600" : "hover:bg-white"
                )}
                onClick={handleLock}
                disabled={!hasSelection}
              >
                {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isLocked 
                ? (language === "ar" ? "فك القفل" : "Unlock") 
                : (language === "ar" ? "قفل" : "Lock")}
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-slate-300 mx-0.5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-red-50 hover:text-red-500"
                onClick={handleDelete}
                disabled={!hasSelection}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{language === "ar" ? "حذف" : "Delete"}</TooltipContent>
          </Tooltip>
        </div>
      </footer>
    </TooltipProvider>
  )
}
