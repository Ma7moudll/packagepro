"use client"

import { FoldLine } from "./types"
import { nanoid } from "nanoid"

export class FoldLineEditor {
  private lines: Map<string, FoldLine> = new Map()
  private selectedLineId: string | null = null
  private isDrawing: boolean = false
  private startPoint: { x: number; y: number } | null = null

  /**
   * Start drawing a new fold line
   */
  startDrawing(
    type: "fold" | "mountain" | "valley",
    point: { x: number; y: number }
  ) {
    this.isDrawing = true
    this.startPoint = point

    const line: FoldLine = {
      id: nanoid(),
      type,
      start: point,
      end: point,
      angle: 0,
      color: this.getColorForType(type),
      thickness: 2,
    }

    this.lines.set(line.id, line)
    this.selectedLineId = line.id

    return line.id
  }

  /**
   * Update end point of current line
   */
  updateEndPoint(point: { x: number; y: number }) {
    if (!this.isDrawing || !this.selectedLineId || !this.startPoint) return

    const line = this.lines.get(this.selectedLineId)
    if (!line) return

    line.end = point
    line.angle = this.calculateAngle(this.startPoint, point)
  }

  /**
   * Finish drawing current line
   */
  finishDrawing() {
    if (!this.isDrawing || !this.selectedLineId) return

    const line = this.lines.get(this.selectedLineId)
    if (!line) return

    this.isDrawing = false
    this.selectedLineId = null
    this.startPoint = null

    return line
  }

  /**
   * Add a complete line
   */
  addLine(line: FoldLine) {
    this.lines.set(line.id, line)
    return line.id
  }

  /**
   * Remove a line
   */
  removeLine(id: string) {
    this.lines.delete(id)
    if (this.selectedLineId === id) {
      this.selectedLineId = null
    }
  }

  /**
   * Update line properties
   */
  updateLine(id: string, updates: Partial<FoldLine>) {
    const line = this.lines.get(id)
    if (!line) return

    Object.assign(line, updates)

    // Recalculate angle if start or end changed
    if (updates.start || updates.end) {
      line.angle = this.calculateAngle(line.start, line.end)
    }
  }

  /**
   * Select a line
   */
  selectLine(id: string | null) {
    this.selectedLineId = id
  }

  /**
   * Get all lines
   */
  getLines(): FoldLine[] {
    return Array.from(this.lines.values())
  }

  /**
   * Get selected line
   */
  getSelectedLine(): FoldLine | null {
    if (!this.selectedLineId) return null
    return this.lines.get(this.selectedLineId) || null
  }

  /**
   * Clear all lines
   */
  clear() {
    this.lines.clear()
    this.selectedLineId = null
    this.isDrawing = false
    this.startPoint = null
  }

  /**
   * Export lines as SVG
   */
  exportAsSVG(): string {
    const paths: string[] = []

    this.lines.forEach((line) => {
      const pathData = `M ${line.start.x} ${line.start.y} L ${line.end.x} ${line.end.y}`
      const dashArray = this.getDashArray(line.type)

      paths.push(
        `<path d="${pathData}" stroke="${line.color}" stroke-width="${line.thickness}" fill="none" stroke-dasharray="${dashArray}" />`
      )
    })

    return `<svg>${paths.join("")}</svg>`
  }

  /**
   * Calculate angle between two points
   */
  private calculateAngle(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): number {
    const dx = end.x - start.x
    const dy = end.y - start.y
    return Math.atan2(dy, dx) * (180 / Math.PI)
  }

  /**
   * Get color for line type
   */
  private getColorForType(type: "fold" | "mountain" | "valley"): string {
    switch (type) {
      case "fold":
        return "#ff9900" // Orange
      case "mountain":
        return "#ff0000" // Red (mountain fold)
      case "valley":
        return "#0000ff" // Blue (valley fold)
      default:
        return "#000000"
    }
  }

  /**
   * Get dash array for line type
   */
  private getDashArray(type: "fold" | "mountain" | "valley"): string {
    switch (type) {
      case "fold":
        return "5,5" // Dashed
      case "mountain":
        return "10,5,2,5" // Dash-dot
      case "valley":
        return "2,5" // Dotted
      default:
        return "0"
    }
  }
}

