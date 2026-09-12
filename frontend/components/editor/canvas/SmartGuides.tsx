"use client"

import { useDesignStore } from "@/lib/editor/state/store"
import { fabric } from "fabric"
import { useEffect, useRef, useCallback } from "react"

interface SmartGuidesProps {
  canvas: fabric.Canvas | null
  enabled?: boolean
  snapThreshold?: number
  guideColor?: string
  canvasRef?: React.MutableRefObject<fabric.Canvas | null>
}

interface GuideLine {
  id: string
  orientation: "horizontal" | "vertical"
  position: number
}

// Helper to get object bounds
function getObjectBounds(obj: fabric.Object) {
  const bound = obj.getBoundingRect(true, true)
  const center = obj.getCenterPoint()
  return {
    left: bound.left,
    right: bound.left + bound.width,
    top: bound.top,
    bottom: bound.top + bound.height,
    centerX: center.x,
    centerY: center.y,
    width: bound.width,
    height: bound.height,
  }
}

export function useSmartGuides({
  canvas,
  enabled = true,
  snapThreshold = 10,
  guideColor = "#00d4ff",
}: SmartGuidesProps) {
  const guideLinesRef = useRef<fabric.Line[]>([])
  const layers = useDesignStore((s) => s.layers)

  const clearGuides = useCallback(() => {
    if (!canvas) return
    guideLinesRef.current.forEach((line) => {
      canvas.remove(line)
    })
    guideLinesRef.current = []
    canvas.renderAll()
  }, [canvas])

  const addGuideLine = useCallback(
    (orientation: "horizontal" | "vertical", position: number) => {
      if (!canvas) return

      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()

      const line = new fabric.Line(
        orientation === "vertical"
          ? [position, 0, position, canvasHeight]
          : [0, position, canvasWidth, position],
        {
          stroke: guideColor,
          strokeWidth: 1,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
          excludeFromExport: true,
        }
      )

      canvas.add(line)
      canvas.bringToFront(line)
      guideLinesRef.current.push(line)
    },
    [canvas, guideColor]
  )

  const snapObject = useCallback(
    (movingObj: fabric.Object) => {
      if (!canvas || !enabled) return

      clearGuides()

      const movingBounds = getObjectBounds(movingObj)
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()

      let snapX: number | null = null
      let snapY: number | null = null

      // Reference points to check
      const hPoints = [
        { pos: movingBounds.left, type: "left" },
        { pos: movingBounds.centerX, type: "centerX" },
        { pos: movingBounds.right, type: "right" },
      ]
      const vPoints = [
        { pos: movingBounds.top, type: "top" },
        { pos: movingBounds.centerY, type: "centerY" },
        { pos: movingBounds.bottom, type: "bottom" },
      ]

      // Canvas edge guides
      const canvasGuides = {
        horizontal: [0, canvasHeight / 2, canvasHeight],
        vertical: [0, canvasWidth / 2, canvasWidth],
      }

      // Check canvas edges
      for (const point of hPoints) {
        for (const guide of canvasGuides.vertical) {
          if (Math.abs(point.pos - guide) < snapThreshold) {
            snapX = guide - (point.pos - (movingObj.left || 0))
            addGuideLine("vertical", guide)
          }
        }
      }

      for (const point of vPoints) {
        for (const guide of canvasGuides.horizontal) {
          if (Math.abs(point.pos - guide) < snapThreshold) {
            snapY = guide - (point.pos - (movingObj.top || 0))
            addGuideLine("horizontal", guide)
          }
        }
      }

      // Check other objects
      const objects = canvas.getObjects().filter(
        (obj) =>
          obj !== movingObj &&
          obj.selectable !== false &&
          !guideLinesRef.current.includes(obj as fabric.Line)
      )

      for (const obj of objects) {
        const objBounds = getObjectBounds(obj)

        // Horizontal alignment (vertical guides)
        const objHPoints = [objBounds.left, objBounds.centerX, objBounds.right]
        for (const movingPoint of hPoints) {
          for (const objPoint of objHPoints) {
            if (Math.abs(movingPoint.pos - objPoint) < snapThreshold) {
              if (snapX === null) {
                snapX = objPoint - (movingPoint.pos - (movingObj.left || 0))
                addGuideLine("vertical", objPoint)
              }
            }
          }
        }

        // Vertical alignment (horizontal guides)
        const objVPoints = [objBounds.top, objBounds.centerY, objBounds.bottom]
        for (const movingPoint of vPoints) {
          for (const objPoint of objVPoints) {
            if (Math.abs(movingPoint.pos - objPoint) < snapThreshold) {
              if (snapY === null) {
                snapY = objPoint - (movingPoint.pos - (movingObj.top || 0))
                addGuideLine("horizontal", objPoint)
              }
            }
          }
        }
      }

      // Apply snap
      if (snapX !== null) {
        movingObj.set({ left: snapX })
      }
      if (snapY !== null) {
        movingObj.set({ top: snapY })
      }

      canvas.renderAll()
    },
    [canvas, enabled, snapThreshold, clearGuides, addGuideLine]
  )

  useEffect(() => {
    if (!canvas || !enabled) return

    const handleObjectMoving = (e: fabric.IEvent) => {
      if (e.target) {
        snapObject(e.target)
      }
    }

    const handleObjectModified = () => {
      clearGuides()
    }

    const handleSelectionCleared = () => {
      clearGuides()
    }

    canvas.on("object:moving", handleObjectMoving)
    canvas.on("object:modified", handleObjectModified)
    canvas.on("selection:cleared", handleSelectionCleared)

    return () => {
      canvas.off("object:moving", handleObjectMoving)
      canvas.off("object:modified", handleObjectModified)
      canvas.off("selection:cleared", handleSelectionCleared)
      clearGuides()
    }
  }, [canvas, enabled, snapObject, clearGuides])

  return { clearGuides, snapObject }
}

// Visual component for showing snap settings UI
export function SmartGuidesSettings() {
  const guidesVisible = useDesignStore((s) => s.ui.guidesVisible)
  const toggleGuides = useDesignStore((s) => s.toggleGuides)

  return (
    <div className="flex items-center gap-2 text-xs">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={guidesVisible}
          onChange={() => toggleGuides()}
          className="rounded border-slate-300"
        />
        <span>Smart Guides</span>
      </label>
    </div>
  )
}
