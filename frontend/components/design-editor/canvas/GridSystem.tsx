"use client"

import { fabric } from "fabric"

export interface GridConfig {
  enabled: boolean
  size: number
  color: string
  snapToGrid: boolean
}

export interface SafeZoneConfig {
  enabled: boolean
  margin: number // in mm
  color: string
}

export interface BleedConfig {
  enabled: boolean
  margin: number // in mm (typically 3mm)
  color: string
}

export class GridSystem {
  /**
   * Enable/disable grid
   */
  static toggleGrid(canvas: fabric.Canvas, enabled: boolean, size: number = 20) {
    // Grid visualization would be implemented here
    // This is typically done via overlay or background pattern
    canvas.renderAll()
  }

  /**
   * Enable snap to grid
   */
  static enableSnapToGrid(canvas: fabric.Canvas, enabled: boolean, gridSize: number = 20) {
    if (!enabled) {
      canvas.off("object:moving")
      return
    }

    canvas.on("object:moving", (e) => {
      const obj = e.target
      if (!obj) return

      const snapX = Math.round((obj.left || 0) / gridSize) * gridSize
      const snapY = Math.round((obj.top || 0) / gridSize) * gridSize

      obj.set({
        left: snapX,
        top: snapY,
      })
    })
  }

  /**
   * Draw safe zone indicator
   */
  static drawSafeZone(
    canvas: fabric.Canvas,
    margin: number,
    color: string = "#ff0000"
  ) {
    // Convert mm to pixels (assuming 96 DPI: 1mm = 3.779 pixels)
    const marginPx = margin * 3.779

    const safeZoneRect = new fabric.Rect({
      left: marginPx,
      top: marginPx,
      width: canvas.width! - marginPx * 2,
      height: canvas.height! - marginPx * 2,
      fill: "",
      stroke: color,
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })

    safeZoneRect.set("name", "safeZone")
    canvas.add(safeZoneRect)
    canvas.sendToBack(safeZoneRect)
  }

  /**
   * Draw bleed area indicator
   */
  static drawBleedArea(
    canvas: fabric.Canvas,
    margin: number,
    color: string = "#00ff00"
  ) {
    // Convert mm to pixels
    const marginPx = margin * 3.779

    const bleedRect = new fabric.Rect({
      left: -marginPx,
      top: -marginPx,
      width: canvas.width! + marginPx * 2,
      height: canvas.height! + marginPx * 2,
      fill: "",
      stroke: color,
      strokeWidth: 1,
      strokeDashArray: [3, 3],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })

    bleedRect.set("name", "bleedArea")
    canvas.add(bleedRect)
    canvas.sendToBack(bleedRect)
  }

  /**
   * Clear safe zone and bleed indicators
   */
  static clearIndicators(canvas: fabric.Canvas) {
    const objects = canvas.getObjects()
    objects.forEach((obj) => {
      const name = (obj as any).name
      if (name === "safeZone" || name === "bleedArea") {
        canvas.remove(obj)
      }
    })
    canvas.renderAll()
  }

  /**
   * Check if object is within safe zone
   */
  static isWithinSafeZone(
    canvas: fabric.Canvas,
    obj: fabric.Object,
    margin: number
  ): boolean {
    const marginPx = margin * 3.779
    const left = obj.left || 0
    const top = obj.top || 0
    const width = (obj.width || 0) * (obj.scaleX || 1)
    const height = (obj.height || 0) * (obj.scaleY || 1)

    return (
      left - width / 2 >= marginPx &&
      top - height / 2 >= marginPx &&
      left + width / 2 <= canvas.width! - marginPx &&
      top + height / 2 <= canvas.height! - marginPx
    )
  }
}

