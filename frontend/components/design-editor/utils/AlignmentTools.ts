"use client"

import { fabric } from "fabric"

export class AlignmentTools {
  /**
   * Align objects to left
   */
  static alignLeft(canvas: fabric.Canvas) {
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 2) return

    const leftMost = Math.min(...activeObjects.map((obj) => (obj.left || 0) - (obj.width || 0) / 2))
    activeObjects.forEach((obj) => {
      obj.set("left", leftMost + (obj.width || 0) / 2)
    })
    canvas.renderAll()
  }

  /**
   * Align objects to center (horizontally)
   */
  static alignCenter(canvas: fabric.Canvas) {
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 2) return

    const centerX = canvas.width! / 2
    activeObjects.forEach((obj) => {
      obj.set("left", centerX)
    })
    canvas.renderAll()
  }

  /**
   * Align objects to right
   */
  static alignRight(canvas: fabric.Canvas) {
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 2) return

    const rightMost = Math.max(...activeObjects.map((obj) => (obj.left || 0) + (obj.width || 0) / 2))
    activeObjects.forEach((obj) => {
      obj.set("left", rightMost - (obj.width || 0) / 2)
    })
    canvas.renderAll()
  }

  /**
   * Align objects to top
   */
  static alignTop(canvas: fabric.Canvas) {
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 2) return

    const topMost = Math.min(...activeObjects.map((obj) => (obj.top || 0) - (obj.height || 0) / 2))
    activeObjects.forEach((obj) => {
      obj.set("top", topMost + (obj.height || 0) / 2)
    })
    canvas.renderAll()
  }

  /**
   * Align objects to middle (vertically)
   */
  static alignMiddle(canvas: fabric.Canvas) {
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 2) return

    const centerY = canvas.height! / 2
    activeObjects.forEach((obj) => {
      obj.set("top", centerY)
    })
    canvas.renderAll()
  }

  /**
   * Align objects to bottom
   */
  static alignBottom(canvas: fabric.Canvas) {
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 2) return

    const bottomMost = Math.max(...activeObjects.map((obj) => (obj.top || 0) + (obj.height || 0) / 2))
    activeObjects.forEach((obj) => {
      obj.set("top", bottomMost - (obj.height || 0) / 2)
    })
    canvas.renderAll()
  }

  /**
   * Distribute objects horizontally
   */
  static distributeHorizontally(canvas: fabric.Canvas) {
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 3) return

    const sorted = [...activeObjects].sort((a, b) => (a.left || 0) - (b.left || 0))
    const leftMost = sorted[0].left || 0
    const rightMost = sorted[sorted.length - 1].left || 0
    const gap = (rightMost - leftMost) / (sorted.length - 1)

    sorted.forEach((obj, idx) => {
      if (idx > 0 && idx < sorted.length - 1) {
        obj.set("left", leftMost + gap * idx)
      }
    })
    canvas.renderAll()
  }

  /**
   * Distribute objects vertically
   */
  static distributeVertically(canvas: fabric.Canvas) {
    const activeObjects = canvas.getActiveObjects()
    if (activeObjects.length < 3) return

    const sorted = [...activeObjects].sort((a, b) => (a.top || 0) - (b.top || 0))
    const topMost = sorted[0].top || 0
    const bottomMost = sorted[sorted.length - 1].top || 0
    const gap = (bottomMost - topMost) / (sorted.length - 1)

    sorted.forEach((obj, idx) => {
      if (idx > 0 && idx < sorted.length - 1) {
        obj.set("top", topMost + gap * idx)
      }
    })
    canvas.renderAll()
  }
}

