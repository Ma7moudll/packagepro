"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { fabric } from "fabric"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, Grid, Download, Magnet } from "lucide-react"
import { useSmartGuides } from "./SmartGuides"
import { ZoneOverlays, ZoneSettings } from "./ZoneOverlays"

interface DesignCanvas2DProps {
  width?: number
  height?: number
}

export function DesignCanvas2D({ width = 800, height = 600 }: DesignCanvas2DProps) {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)

  const layers = useDesignStore((s) => s.layers)
  const selectedLayerIds = useDesignStore((s) => s.selectedLayerIds)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)
  const gridVisible = useDesignStore((s) => s.ui.gridVisible)
  const camera = useDesignStore((s) => s.camera)
  const canvasState = useDesignStore((s) => s.canvas)
  const addLayer = useDesignStore((s) => s.addLayer)
  const updateLayer = useDesignStore((s) => s.updateLayer)
  const removeLayer = useDesignStore((s) => s.removeLayer)
  const setSelectedLayers = useDesignStore((s) => s.setSelectedLayers)
  const setCameraZoom = useDesignStore((s) => s.setCameraZoom)
  const toggleGrid = useDesignStore((s) => s.toggleGrid)
  const guidesVisible = useDesignStore((s) => s.ui.guidesVisible)
  const toggleGuides = useDesignStore((s) => s.toggleGuides)
  
  // Zone visibility state
  const [showBleed, setShowBleed] = useState(true)
  const [showSafeZone, setShowSafeZone] = useState(true)

  // Smart Guides hook
  useSmartGuides({
    canvas: fabricCanvasRef.current,
    enabled: guidesVisible,
    snapThreshold: 10,
    guideColor: "#00d4ff",
  })

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: canvasState.backgroundColor,
        selection: true,
        preserveObjectStacking: true,
      })

      fabricCanvasRef.current = canvas

      // Handle selection
      canvas.on("selection:created", (e) => {
        if (e.selected && e.selected[0]) {
          const fabricObj = e.selected[0] as any
          const layerId = fabricObj.layerId
          if (layerId) {
            setSelectedLayers([layerId])
          }
        }
      })

      canvas.on("selection:updated", (e) => {
        if (e.selected && e.selected[0]) {
          const fabricObj = e.selected[0] as any
          const layerId = fabricObj.layerId
          if (layerId) {
            setSelectedLayers([layerId])
          }
        }
      })

      canvas.on("selection:cleared", () => {
        setSelectedLayers([])
      })

      // Handle object modifications
      canvas.on("object:modified", (e) => {
        const fabricObj = e.target as any
        const layerId = fabricObj.layerId
        if (layerId && fabricObj) {
          syncFabricObjectToLayer(fabricObj, layerId)
        }
      })

      canvas.on("object:moving", (e) => {
        const fabricObj = e.target as any
        const layerId = fabricObj.layerId
        if (layerId && fabricObj) {
          updateLayer(layerId, (layer) => ({
            ...layer,
            position: { x: fabricObj.left || 0, y: fabricObj.top || 0 },
          }))
        }
      })

      canvas.on("object:scaling", (e) => {
        const fabricObj = e.target as any
        const layerId = fabricObj.layerId
        if (layerId && fabricObj) {
          updateLayer(layerId, (layer) => ({
            ...layer,
            scale: { x: fabricObj.scaleX || 1, y: fabricObj.scaleY || 1 },
          }))
        }
      })

      canvas.on("object:rotating", (e) => {
        const fabricObj = e.target as any
        const layerId = fabricObj.layerId
        if (layerId && fabricObj) {
          updateLayer(layerId, (layer) => ({
            ...layer,
            rotation: (fabricObj.angle || 0) * (Math.PI / 180),
          }))
        }
      })

      return () => {
        canvas.dispose()
        fabricCanvasRef.current = null
      }
    }
  }, [])

  // Handle background color changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setBackgroundColor(canvasState.backgroundColor, () => {
        fabricCanvasRef.current?.renderAll()
      })
    }
  }, [canvasState.backgroundColor])

  // Handle resize
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({ width, height })
      fabricCanvasRef.current.renderAll()
    }
  }, [width, height])

  // Sync layers from store to Fabric canvas
  useEffect(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const faceLayers = layers.filter((l) => l.faceId === selectedFace && l.visible)

    // Remove objects that are no longer in layers
    const existingObjects = canvas.getObjects()
    existingObjects.forEach((obj: any) => {
      const layerId = obj.layerId
      if (!faceLayers.find((l) => l.id === layerId)) {
        canvas.remove(obj)
      }
    })

    // Add/update objects from layers
    faceLayers.forEach((layer) => {
      const existingObj = canvas.getObjects().find((obj: any) => obj.layerId === layer.id) as any

      if (!existingObj) {
        // Create new Fabric object from layer
        createFabricObjectFromLayer(layer)
      } else {
        // Update existing object
        updateFabricObjectFromLayer(existingObj, layer)
      }
    })

    canvas.renderAll()
  }, [layers, selectedFace])

  // Sync selected layers to Fabric selection
  useEffect(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const selectedObjects = canvas.getObjects().filter((obj: any) =>
      selectedLayerIds.includes(obj.layerId)
    )

    if (selectedObjects.length > 0) {
      canvas.setActiveObject(
        selectedObjects.length === 1
          ? selectedObjects[0]
          : new fabric.ActiveSelection(selectedObjects, { canvas })
      )
    } else {
      canvas.discardActiveObject()
    }
    canvas.renderAll()
  }, [selectedLayerIds])

  // Apply camera zoom
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(camera.zoom)
    }
  }, [camera.zoom])

  const syncFabricObjectToLayer = useCallback(
    (fabricObj: any, layerId: string) => {
      const layer = layers.find((l) => l.id === layerId)
      if (!layer) return

      if (layer.type === "text" && fabricObj instanceof fabric.Text) {
        updateLayer(layerId, (l) => ({
          ...l,
          position: { x: fabricObj.left || 0, y: fabricObj.top || 0 },
          rotation: (fabricObj.angle || 0) * (Math.PI / 180),
          scale: { x: fabricObj.scaleX || 1, y: fabricObj.scaleY || 1 },
          textProperties: {
            ...l.textProperties!,
            content: fabricObj.text || "",
            fontSize: fabricObj.fontSize || 40,
            color: (fabricObj.fill as string) || "#000000",
            fontFamily: fabricObj.fontFamily || "Arial",
          },
        }))
      } else if (layer.type === "image" && fabricObj instanceof fabric.Image) {
        updateLayer(layerId, (l) => ({
          ...l,
          position: { x: fabricObj.left || 0, y: fabricObj.top || 0 },
          rotation: (fabricObj.angle || 0) * (Math.PI / 180),
          scale: { x: fabricObj.scaleX || 1, y: fabricObj.scaleY || 1 },
        }))
      } else if (layer.type === "shape" && fabricObj instanceof fabric.Rect) {
        updateLayer(layerId, (l) => ({
          ...l,
          position: { x: fabricObj.left || 0, y: fabricObj.top || 0 },
          rotation: (fabricObj.angle || 0) * (Math.PI / 180),
          scale: { x: fabricObj.scaleX || 1, y: fabricObj.scaleY || 1 },
          shapeProperties: {
            ...l.shapeProperties!,
            fill: (fabricObj.fill as string) || "#000000",
            stroke: (fabricObj.stroke as string) || "",
            strokeWidth: fabricObj.strokeWidth || 0,
          },
        }))
      }
    },
    [layers, updateLayer]
  )

  const createFabricObjectFromLayer = useCallback(
    (layer: any) => {
      if (!fabricCanvasRef.current) return

      let fabricObj: fabric.Object | null = null

      if (layer.type === "text" && layer.textProperties) {
        fabricObj = new fabric.Text(layer.textProperties.content || "Text", {
          left: layer.position.x,
          top: layer.position.y,
          fontSize: layer.textProperties.fontSize || 40,
          fill: layer.textProperties.color || "#000000",
          fontFamily: layer.textProperties.fontFamily || "Arial",
          angle: (layer.rotation * 180) / Math.PI,
          scaleX: layer.scale.x,
          scaleY: layer.scale.y,
          opacity: layer.opacity,
          originX: "center",
          originY: "center",
        })
      } else if (layer.type === "image" && layer.imageProperties) {
        fabric.Image.fromURL(layer.imageProperties.src, (img) => {
          img.set({
            left: layer.position.x,
            top: layer.position.y,
            angle: (layer.rotation * 180) / Math.PI,
            scaleX: layer.scale.x,
            scaleY: layer.scale.y,
            opacity: layer.opacity,
            originX: "center",
            originY: "center",
          })
            ; (img as any).layerId = layer.id
          fabricCanvasRef.current?.add(img)
        })
        return
      } else if (layer.type === "shape" && layer.shapeProperties) {
        if (layer.shapeProperties.shape === "rect") {
          fabricObj = new fabric.Rect({
            left: layer.position.x,
            top: layer.position.y,
            width: 100,
            height: 100,
            fill: layer.shapeProperties.fill || "#000000",
            stroke: layer.shapeProperties.stroke || "",
            strokeWidth: layer.shapeProperties.strokeWidth || 0,
            rx: layer.shapeProperties.cornerRadius || 0,
            angle: (layer.rotation * 180) / Math.PI,
            scaleX: layer.scale.x,
            scaleY: layer.scale.y,
            opacity: layer.opacity,
            originX: "center",
            originY: "center",
          })
        } else if (layer.shapeProperties.shape === "circle") {
          fabricObj = new fabric.Circle({
            left: layer.position.x,
            top: layer.position.y,
            radius: 50,
            fill: layer.shapeProperties.fill || "#000000",
            stroke: layer.shapeProperties.stroke || "",
            strokeWidth: layer.shapeProperties.strokeWidth || 0,
            angle: (layer.rotation * 180) / Math.PI,
            scaleX: layer.scale.x,
            scaleY: layer.scale.y,
            opacity: layer.opacity,
            originX: "center",
            originY: "center",
          })
        }
      }

      if (fabricObj) {
        ; (fabricObj as any).layerId = layer.id
        fabricCanvasRef.current.add(fabricObj)
      }
    },
    []
  )

  const updateFabricObjectFromLayer = useCallback((fabricObj: any, layer: any) => {
    fabricObj.set({
      left: layer.position.x,
      top: layer.position.y,
      angle: (layer.rotation * 180) / Math.PI,
      scaleX: layer.scale.x,
      scaleY: layer.scale.y,
      opacity: layer.opacity,
      originX: "center",
      originY: "center",
    })

    if (layer.type === "text" && layer.textProperties && fabricObj instanceof fabric.Text) {
      fabricObj.set({
        text: layer.textProperties.content || "",
        fontSize: layer.textProperties.fontSize || 40,
        fill: layer.textProperties.color || "#000000",
        fontFamily: layer.textProperties.fontFamily || "Arial",
      })
    } else if (layer.type === "shape" && layer.shapeProperties) {
      if (fabricObj instanceof fabric.Rect) {
        fabricObj.set({
          fill: layer.shapeProperties.fill || "#000000",
          stroke: layer.shapeProperties.stroke || "",
          strokeWidth: layer.shapeProperties.strokeWidth || 0,
          rx: layer.shapeProperties.cornerRadius || 0,
        })
      } else if (fabricObj instanceof fabric.Circle) {
        fabricObj.set({
          fill: layer.shapeProperties.fill || "#000000",
          stroke: layer.shapeProperties.stroke || "",
          strokeWidth: layer.shapeProperties.strokeWidth || 0,
        })
      }
    }

    fabricCanvasRef.current?.renderAll()
  }, [])

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.5, Math.min(2, camera.zoom + delta))
    setCameraZoom(newZoom)
  }

  const resetCamera = () => {
    setCameraZoom(1)
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.viewportTransform = [1, 0, 0, 1, 0, 0]
    }
  }

  const exportDesign = () => {
    if (fabricCanvasRef.current) {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 2,
      })
      const link = document.createElement("a")
      link.download = "design.png"
      link.href = dataURL
      link.click()
    }
  }

  // Expose methods globally for backward compatibility
  useEffect(() => {
    // @ts-ignore
    window.__editorAddText = () => {
      const store = useDesignStore.getState()
      const newLayer = {
        type: "text" as const,
        name: "Text Layer",
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal" as const,
        position: { x: width / 2, y: height / 2 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        faceId: store.ui.selectedFace,
        textProperties: {
          content: language === "ar" ? "اضغط للتعديل" : "Click to edit",
          fontFamily: "Arial",
          fontSize: 40,
          fontWeight: 400,
          lineHeight: 1.2,
          letterSpacing: 0,
          align: "left" as const,
          color: "#000000",
        },
      }
      addLayer(newLayer)
    }

    // @ts-ignore
    window.__editorAddImage = (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const store = useDesignStore.getState()
        const newLayer = {
          type: "image" as const,
          name: file.name || "Image",
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: "normal" as const,
          position: { x: width / 2, y: height / 2 },
          rotation: 0,
          scale: { x: 0.5, y: 0.5 },
          faceId: store.ui.selectedFace,
          imageProperties: {
            src: dataUrl,
          },
        }
        addLayer(newLayer)
      }
      reader.readAsDataURL(file)
    }

    // @ts-ignore
    window.__editorAddShape = (shape: "rect" | "circle" = "rect") => {
      const store = useDesignStore.getState()
      const newLayer = {
        type: "shape" as const,
        name: `${shape} Shape`,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal" as const,
        position: { x: width / 2, y: height / 2 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        faceId: store.ui.selectedFace,
        shapeProperties: {
          shape,
          fill: "#d2b48c",
          stroke: "",
          strokeWidth: 0,
        },
      }
      addLayer(newLayer)
    }

    // @ts-ignore
    window.__editorDeleteSelected = () => {
      selectedLayerIds.forEach((id) => removeLayer(id))
      setSelectedLayers([])
    }

    // @ts-ignore
    window.__editorDuplicateSelected = () => {
      selectedLayerIds.forEach((id) => {
        const layer = layers.find((l) => l.id === id)
        if (layer) {
          const newLayer = { ...layer, name: `${layer.name} Copy` }
          addLayer(newLayer)
        }
      })
    }
  }, [language, addLayer, removeLayer, selectedLayerIds, layers, setSelectedLayers])

  return (
    <div className="relative w-full h-full flex flex-col bg-white">
      {/* 2D Canvas Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg border p-2">
          <Button size="sm" variant="outline" onClick={() => handleZoom(0.1)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleZoom(-0.1)}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={resetCamera}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={gridVisible ? "default" : "outline"} onClick={toggleGrid} title={language === "ar" ? "الشبكة" : "Grid"}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={guidesVisible ? "default" : "outline"} onClick={toggleGuides} title={language === "ar" ? "المحاذاة الذكية" : "Smart Guides"}>
            <Magnet className="h-4 w-4" />
          </Button>
          <ZoneSettings />
          <Button size="sm" variant="outline" onClick={exportDesign} title={language === "ar" ? "تحميل" : "Download"}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2D Canvas */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 overflow-auto p-8">
        <div className="relative" style={{ padding: showBleed ? "12px" : 0 }}>
          {/* Zone Overlays */}
          <ZoneOverlays
            canvasWidth={width}
            canvasHeight={height}
            bleedSize={3}
            safeZoneSize={5}
            showBleed={showBleed}
            showSafeZone={showSafeZone}
            scale={3}
          />
          {gridVisible && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20 z-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #94a3b8 1px, transparent 1px),
                  linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
              }}
            />
          )}
          <canvas ref={canvasRef} className="shadow-xl border border-slate-300 bg-white relative z-0" />
        </div>
      </div>
    </div>
  )
}

