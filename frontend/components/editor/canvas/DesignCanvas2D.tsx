"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import * as fabric from "fabric"
import { useDesignStore } from "@/lib/editor/state/store"
import { BLEED_MM, SAFE_MM } from "@/lib/editor/geometry/units"
import { unsupportedArtworkOutputMessage, unsupportedSheetArtwork } from "@/lib/editor/print-coverage"
import { useLanguage } from "@/providers/language-provider"
import { TextProperties, ImageFilterConfig, DEFAULT_IMAGE_FILTERS } from "@/lib/editor/state/types"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, Grid, Download, Magnet } from "lucide-react"
import { useSmartGuides } from "./SmartGuides"
import { ZoneOverlays, ZoneSettings } from "./ZoneOverlays"

function applyTextPropertiesToFabric(
  obj: fabric.Text,
  props: TextProperties,
  _opacity: number
) {
  obj.set({
    fontSize: props.fontSize || 40,
    fill: props.color || "#000000",
    fontFamily: props.fontFamily || "Arial",
    fontWeight: props.fontWeight as any,
    lineHeight: props.lineHeight || 1.2,
    charSpacing: (props.letterSpacing || 0) * 10,
    textAlign: props.align || "left",
  })

  if (props.shadow) {
    const shadow = new fabric.Shadow({
      color: props.shadow.color,
      blur: props.shadow.blur,
      offsetX: props.shadow.offsetX,
      offsetY: props.shadow.offsetY,
    })
    ;(obj as any).shadow = shadow
  }

  if (props.stroke) {
    obj.set({
      stroke: props.stroke.color,
      strokeWidth: props.stroke.width,
      strokeUniform: true,
    })
  } else {
    obj.set({ stroke: undefined, strokeWidth: 0 })
  }
}

function createCurvedTextGroup(
  text: string,
  props: TextProperties,
  radius: number,
  layer: any
): fabric.Group {
  const chars = text.split("")
  const charObjects: fabric.Object[] = []

  const approxCharWidth = (props.fontSize || 40) * 0.55
  const totalWidth = chars.length * approxCharWidth
  const arcAngle = totalWidth / radius

  const startAngle = -arcAngle / 2

  chars.forEach((char, i) => {
    const angle = startAngle + (i * approxCharWidth + approxCharWidth / 2) / radius
    const x = radius * Math.sin(angle)
    const y = radius * (1 - Math.cos(angle))

    const charObj = new fabric.Text(char, {
      left: x,
      top: y,
      fontSize: props.fontSize || 40,
      fill: props.color || "#000000",
      fontFamily: props.fontFamily || "Arial",
      fontWeight: props.fontWeight as any,
      angle: (angle * 180) / Math.PI,
      originX: "center",
      originY: "center",
    })

    if (props.shadow) {
      const shadow = new fabric.Shadow({
        color: props.shadow.color,
        blur: props.shadow.blur,
        offsetX: props.shadow.offsetX,
        offsetY: props.shadow.offsetY,
      })
      ;(charObj as any).shadow = shadow
    }
    if (props.stroke) {
      charObj.set({
        stroke: props.stroke.color,
        strokeWidth: props.stroke.width,
        strokeUniform: true,
      })
    }

    charObjects.push(charObj)
  })

  const group = new fabric.Group(charObjects, {
    left: layer.position.x,
    top: layer.position.y,
    originX: "center",
    originY: "center",
  })
  ;(group as any).layerId = layer.id
  return group
}

function applyImageFilters(img: any, config?: ImageFilterConfig) {
  const filters: any[] = []
  const cfg = config ?? DEFAULT_IMAGE_FILTERS

  if (cfg.brightness !== 100) {
    filters.push(new (fabric.filters as any).Brightness({
      brightness: (cfg.brightness - 100) / 100,
    }))
  }

  if (cfg.contrast !== 100) {
    filters.push(new (fabric.filters as any).Contrast({
      contrast: (cfg.contrast - 100) / 100,
    }))
  }

  if (cfg.saturation !== 100) {
    filters.push(new (fabric.filters as any).Saturation({
      saturation: (cfg.saturation - 100) / 100,
    }))
  }

  if (cfg.blur > 0) {
    filters.push(new (fabric.filters as any).Blur({
      blur: cfg.blur * 0.05,
    }))
  }

  if (cfg.grayscale > 50) {
    filters.push(new (fabric.filters as any).Grayscale())
  }

  if (cfg.sepia > 50) {
    filters.push(new (fabric.filters as any).Sepia())
  }

  if (cfg.invert > 50) {
    filters.push(new (fabric.filters as any).Invert())
  }

  if (cfg.hueRotate !== 0) {
    filters.push(new (fabric.filters as any).HueRotation({
      rotation: cfg.hueRotate / 360,
    }))
  }

  if (filters.length > 0) {
    ;(img as any).filters = filters
    img.applyFilters()
  }
}

export function DesignCanvas2D() {
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
  const [canvasReady, setCanvasReady] = useState(false)
  const [exportNotice, setExportNotice] = useState("")

  // Smart Guides hook - uses canvasReady state to ensure canvas is initialized
  useSmartGuides({
    canvas: canvasReady ? fabricCanvasRef.current : null,
    enabled: guidesVisible,
    snapThreshold: 10,
    guideColor: "#00d4ff",
  })

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasState.width,
        height: canvasState.height,
        backgroundColor: canvasState.backgroundColor,
        selection: true,
        preserveObjectStacking: true,
      })

      fabricCanvasRef.current = canvas
      ;(window as any).__fabricCanvas = canvas
      setCanvasReady(true)

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
        if ((window as any).__fabricCanvas === canvas) (window as any).__fabricCanvas = null
        canvas.dispose()
        fabricCanvasRef.current = null
      }
    }
  }, [])

  // Handle background color changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.backgroundColor = canvasState.backgroundColor
      fabricCanvasRef.current.renderAll()
    }
  }, [canvasState.backgroundColor])

  // Handle resize (canvas dims are derived from the selected face's mm panel)
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setDimensions({
        width: canvasState.width,
        height: canvasState.height,
      })
      fabricCanvasRef.current.renderAll()
    }
  }, [canvasState.width, canvasState.height])

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
      // Canvas listeners outlive the render that registered them. Read the
      // current layer, not the initial empty layers closure, when persisting.
      const layer = useDesignStore.getState().layers.find((l) => l.id === layerId)
      if (!layer) return

      if (layer.type === "text" && fabricObj instanceof fabric.Text) {
        const fabShadow = fabricObj.shadow as any
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
            fontWeight: typeof fabricObj.fontWeight === "number" ? fabricObj.fontWeight : 400,
            lineHeight: fabricObj.lineHeight || 1.2,
            letterSpacing: (fabricObj.charSpacing || 0) / 10,
            align: (fabricObj.textAlign as any) || "left",
            shadow: fabShadow
              ? {
                  offsetX: fabShadow.offsetX || 0,
                  offsetY: fabShadow.offsetY || 0,
                  blur: fabShadow.blur || 0,
                  color: fabShadow.color || "#000000",
                }
              : undefined,
            stroke: fabricObj.stroke
              ? {
                  color: fabricObj.stroke as string,
                  width: fabricObj.strokeWidth || 1,
                }
              : undefined,
          },
        }))
      } else if (fabricObj instanceof fabric.Group) {
        updateLayer(layerId, (l) => ({
          ...l,
          position: { x: fabricObj.left || 0, y: fabricObj.top || 0 },
          rotation: (fabricObj.angle || 0) * (Math.PI / 180),
          scale: { x: fabricObj.scaleX || 1, y: fabricObj.scaleY || 1 },
        }))
      } else if (layer.type === "image" && fabricObj instanceof fabric.Image) {
        updateLayer(layerId, (l) => ({
          ...l,
          position: { x: fabricObj.left || 0, y: fabricObj.top || 0 },
          rotation: (fabricObj.angle || 0) * (Math.PI / 180),
          scale: { x: fabricObj.scaleX || 1, y: fabricObj.scaleY || 1 },
          imageProperties: {
            ...l.imageProperties!,
            filters: l.imageProperties?.filters,
          },
        }))
      } else if (layer.type === "shape") {
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
        const props = layer.textProperties

        if (props.curveRadius && props.curveRadius > 0) {
          const group = createCurvedTextGroup(props.content || "Text", props, props.curveRadius, layer)
          ;(group as any).layerId = layer.id
          fabricCanvasRef.current.add(group)
          return
        }

        fabricObj = new fabric.Text(props.content || "Text", {
          left: layer.position.x,
          top: layer.position.y,
          angle: (layer.rotation * 180) / Math.PI,
          scaleX: layer.scale.x,
          scaleY: layer.scale.y,
          opacity: layer.opacity,
          originX: "center",
          originY: "center",
        })

        applyTextPropertiesToFabric(fabricObj as fabric.Text, props, layer.opacity)
      } else if (layer.type === "image" && layer.imageProperties) {
        fabric.Image.fromURL(layer.imageProperties.src).then((img) => {
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
          if (layer.imageProperties?.filters) {
            applyImageFilters(img, layer.imageProperties.filters)
          }
          // Image loads are async — the face may have changed (or the layer been
          // hidden/deleted) before the callback fires. Only add the object when it
          // is still the current, visible layer of the active face.
          const live = useDesignStore.getState().layers.find((l) => l.id === layer.id)
          const stillShown = !!live && live.visible && live.faceId === useDesignStore.getState().ui.selectedFace
          if (stillShown) {
            fabricCanvasRef.current?.add(img)
          }
          fabricCanvasRef.current?.renderAll()
        }).catch((error) => {
          console.warn("Could not load editor image", error)
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
        } else if (layer.shapeProperties.shape === "line") {
          const len = 100
          fabricObj = new fabric.Line(
            [-len / 2, 0, len / 2, 0],
            {
              left: layer.position.x,
              top: layer.position.y,
              stroke: layer.shapeProperties.fill || "#000000",
              strokeWidth: layer.shapeProperties.strokeWidth || 2,
              angle: (layer.rotation * 180) / Math.PI,
              scaleX: layer.scale.x,
              scaleY: layer.scale.y,
              opacity: layer.opacity,
              originX: "center",
              originY: "center",
            }
          )
        } else if (layer.shapeProperties.shape === "triangle") {
          fabricObj = new fabric.Triangle({
            left: layer.position.x,
            top: layer.position.y,
            width: 100,
            height: 100,
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
      applyTextPropertiesToFabric(fabricObj, layer.textProperties, layer.opacity)
      fabricObj.set({
        text: layer.textProperties.content || "",
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
      } else if (fabricObj instanceof fabric.Line) {
        fabricObj.set({
          stroke: layer.shapeProperties.fill || "#000000",
          strokeWidth: layer.shapeProperties.strokeWidth || 2,
        })
      } else if (fabricObj instanceof fabric.Triangle) {
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
    // Shared output boundary (this button is a current-face PNG reference,
    // not a full-design export): a two-face sheet carrying inside-face
    // artwork must not produce a file that silently omits that artwork.
    const storeState = useDesignStore.getState()
    const unsupported = unsupportedSheetArtwork(storeState.model.faces, storeState.layers)
    if (unsupported) {
      setExportNotice(language === "ar" ? "التنزيل محظور: راجع تنبيه التصميم أعلاه." : "Download blocked. See the artwork warning above.")
      return
    }
    setExportNotice("")
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
        position: { x: store.canvas.width / 2, y: store.canvas.height / 2 },
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
          position: { x: store.canvas.width / 2, y: store.canvas.height / 2 },
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
        position: { x: store.canvas.width / 2, y: store.canvas.height / 2 },
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

    // Test/Debug harness: mirror the existing __editor* hooks for E2E editing.
    // @ts-ignore
    window.__editorSetFace = (faceId: string) => {
      useDesignStore.getState().setSelectedFace(faceId as any)
    }

    // @ts-ignore
    window.__editorUpdateLayer = (id: string, patch: any) => {
      const store = useDesignStore.getState()
      store.updateLayer(id, (layer) =>
        Object.assign({}, layer, typeof patch === "function" ? patch(layer) : patch)
      )
    }

    // @ts-ignore
    window.__editorSelect = (ids: string[]) => {
      useDesignStore.getState().setSelectedLayers(Array.isArray(ids) ? ids : [ids])
    }

    // @ts-ignore
    window.__editorSetViewMode = (mode: "2d" | "3d" | "dieline" | "wall") =>
      useDesignStore.getState().setViewMode(mode)

    // @ts-ignore
    window.__editorZoom = (delta: number) => {
      const store = useDesignStore.getState()
      const newZoom = Math.max(0.5, Math.min(2, store.camera.zoom + delta))
      store.setCameraZoom(newZoom)
    }

    // @ts-ignore
    window.__editorUndo = () => useDesignStore.getState().undo()

    // @ts-ignore
    window.__editorRedo = () => useDesignStore.getState().redo()

    // @ts-ignore
    window.__editorDelete = () => {
      const store = useDesignStore.getState()
      store.selectedLayerIds.forEach((id) => store.removeLayer(id))
      store.setSelectedLayers([])
    }

    // @ts-ignore
    window.__editorDuplicate = () => {
      const store = useDesignStore.getState()
      store.selectedLayerIds.forEach((id) => {
        const layer = store.layers.find((l) => l.id === id)
        if (layer) {
          store.addLayer({ ...layer, name: `${layer.name} Copy` })
        }
      })
    }

    // @ts-ignore
    window.__editorState = () => {
      const store = useDesignStore.getState()
      return JSON.parse(
        JSON.stringify({
          model: store.model,
          canvas: store.canvas,
          camera: store.camera,
          layers: store.layers,
          selectedLayerIds: store.selectedLayerIds,
          ui: { viewMode: store.ui.viewMode, selectedFace: store.ui.selectedFace },
          history: { past: store.history.past.length, future: store.history.future.length },
          product: store.product,
          productConfig: store.productConfig,
          zones: store.zones,
          structureType: store.structureType,
        })
      )
    }
  }, [language, addLayer, removeLayer, selectedLayerIds, layers, setSelectedLayers])

  return (
    <div className="relative w-full h-full flex flex-col bg-white">
      {/* 2D Canvas Toolbar */}
      <div className="relative z-10 w-full min-w-0 shrink-0 p-2">
        <div className="flex max-w-full min-w-0 items-center gap-2 overflow-x-auto bg-white/95 backdrop-blur-sm rounded-lg border p-2 [&>button]:shrink-0">
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
          <Button size="sm" variant="outline" onClick={exportDesign} title={language === "ar" ? "تنزيل الوجه الحالي (مرجع PNG)" : "Download current face (PNG reference)"}>
            <Download className="h-4 w-4" />
          </Button>

        </div>
        {exportNotice && <p role="alert" className="bg-white px-2 py-1 text-xs text-red-700">{exportNotice}</p>}
      </div>

      {/* 2D Canvas */}
      <div className="min-h-0 min-w-0 flex-1 flex items-center justify-center bg-slate-50 overflow-auto p-8">
        <div className="relative" style={{ padding: showBleed ? "12px" : 0 }}>
          {/* Zone Overlays */}
          <ZoneOverlays
            canvasWidth={canvasState.width}
            canvasHeight={canvasState.height}
            bleedSize={BLEED_MM}
            safeZoneSize={SAFE_MM}
            showBleed={showBleed}
            showSafeZone={showSafeZone}
          />
          {/* Grid overlay: always mounted, visibility toggled via display.
              Fabric wraps <canvas> in its own container on init, so React
              inserting/removing this div (with the canvas as anchor) crashes
              with insertBefore NotFoundError. */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 z-0"
            style={{
              display: gridVisible ? "block" : "none",
              backgroundImage: `
                linear-gradient(to right, #94a3b8 1px, transparent 1px),
                linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
            }}
          />
          <canvas ref={canvasRef} className="shadow-xl border border-slate-300 relative z-0" />
        </div>
      </div>
    </div>
  )
}

