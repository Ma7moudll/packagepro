"use client"

import { DieCutLine } from "./types"
import { nanoid } from "nanoid"

export class DieCutEditor {
  private lines: Map<string, DieCutLine> = new Map()
  private selectedLineId: string | null = null
  private isDrawing: boolean = false
  private currentPoints: Array<{ x: number; y: number }> = []

  /**
   * Start drawing a new die-cut line
   */
  startDrawing(
    type: "cut" | "perforation" | "score",
    point: { x: number; y: number }
  ) {
    this.isDrawing = true
    this.currentPoints = [point]

    const line: DieCutLine = {
      id: nanoid(),
      type,
      points: [point],
      closed: false,
      color: this.getColorForType(type),
      thickness: 2,
    }

    this.lines.set(line.id, line)
    this.selectedLineId = line.id

    return line.id
  }

  /**
   * Add point to current line
   */
  addPoint(point: { x: number; y: number }) {
    if (!this.isDrawing || !this.selectedLineId) return

    const line = this.lines.get(this.selectedLineId)
    if (!line) return

    line.points.push(point)
    this.currentPoints.push(point)
  }

  /**
   * Finish drawing current line
   */
  finishDrawing(closed: boolean = false) {
    if (!this.isDrawing || !this.selectedLineId) return

    const line = this.lines.get(this.selectedLineId)
    if (!line) return

    line.closed = closed
    this.isDrawing = false
    this.selectedLineId = null
    this.currentPoints = []

    return line
  }

  /**
   * Add a complete line
   */
  addLine(line: DieCutLine) {
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
  updateLine(id: string, updates: Partial<DieCutLine>) {
    const line = this.lines.get(id)
    if (!line) return

    Object.assign(line, updates)
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
  getLines(): DieCutLine[] {
    return Array.from(this.lines.values())
  }

  /**
   * Get selected line
   */
  getSelectedLine(): DieCutLine | null {
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
    this.currentPoints = []
  }

  /**
   * Export lines as SVG path
   */
  exportAsSVG(): string {
    const paths: string[] = []

    this.lines.forEach((line) => {
      if (line.points.length < 2) return

      const pathData = line.points
        .map((point, index) => {
          if (index === 0) return `M ${point.x} ${point.y}`
          return `L ${point.x} ${point.y}`
        })
        .join(" ")

      if (line.closed) {
        paths.push(`<path d="${pathData} Z" stroke="${line.color}" stroke-width="${line.thickness}" fill="none" stroke-dasharray="${this.getDashArray(line.type)}" />`)
      } else {
        paths.push(`<path d="${pathData}" stroke="${line.color}" stroke-width="${line.thickness}" fill="none" stroke-dasharray="${this.getDashArray(line.type)}" />`)
      }
    })

    return `<svg>${paths.join("")}</svg>`
  }

  /**
   * Get color for line type
   */
  private getColorForType(type: "cut" | "perforation" | "score"): string {
    switch (type) {
      case "cut":
        return "#ff0000" // Red
      case "perforation":
        return "#00ff00" // Green
      case "score":
        return "#0000ff" // Blue
      default:
        return "#000000"
    }
  }

  /**
   * Get dash array for line type
   */
  private getDashArray(type: "cut" | "perforation" | "score"): string {
    switch (type) {
      case "cut":
        return "0" // Solid
      case "perforation":
        return "5,5" // Dashed
      case "score":
        return "10,5" // Dotted
      default:
        return "0"
    }
  }
}

