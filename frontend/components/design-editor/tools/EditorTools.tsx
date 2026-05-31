"use client"

import { fabric } from "fabric"
import { Button } from "@/components/ui/button"
import {
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Minus,
  Triangle,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react"

export class EditorTools {
  /**
   * Add rectangle shape
   */
  static addRectangle(canvas: fabric.Canvas, options?: Partial<fabric.IRectOptions>) {
    const rect = new fabric.Rect({
      left: 200,
      top: 200,
      width: 100,
      height: 100,
      fill: "#000000",
      stroke: "#000000",
      strokeWidth: 2,
      ...options,
    })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    return rect
  }

  /**
   * Add circle shape
   */
  static addCircle(canvas: fabric.Canvas, options?: Partial<fabric.ICircleOptions>) {
    const circle = new fabric.Circle({
      left: 200,
      top: 200,
      radius: 50,
      fill: "#000000",
      stroke: "#000000",
      strokeWidth: 2,
      ...options,
    })
    canvas.add(circle)
    canvas.setActiveObject(circle)
    return circle
  }

  /**
   * Add line
   */
  static addLine(canvas: fabric.Canvas, options?: Partial<fabric.ILineOptions>) {
    const line = new fabric.Line([100, 100, 300, 100], {
      stroke: "#000000",
      strokeWidth: 2,
      ...options,
    })
    canvas.add(line)
    canvas.setActiveObject(line)
    return line
  }

  /**
   * Add triangle
   */
  static addTriangle(canvas: fabric.Canvas, options?: Partial<fabric.ITriangleOptions>) {
    const triangle = new fabric.Triangle({
      left: 200,
      top: 200,
      width: 100,
      height: 100,
      fill: "#000000",
      stroke: "#000000",
      strokeWidth: 2,
      ...options,
    })
    canvas.add(triangle)
    canvas.setActiveObject(triangle)
    return triangle
  }

  /**
   * Add polygon
   */
  static addPolygon(
    canvas: fabric.Canvas,
    points: number[],
    options?: Partial<fabric.IPolygonOptions>
  ) {
    const polygon = new fabric.Polygon(points, {
      left: 200,
      top: 200,
      fill: "#000000",
      stroke: "#000000",
      strokeWidth: 2,
      ...options,
    })
    canvas.add(polygon)
    canvas.setActiveObject(polygon)
    return polygon
  }

  /**
   * Apply text formatting
   */
  static applyTextFormatting(
    canvas: fabric.Canvas,
    format: "bold" | "italic" | "underline"
  ) {
    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "text") {
      const textObj = activeObject as fabric.Text
      switch (format) {
        case "bold":
          textObj.fontWeight = textObj.fontWeight === "bold" ? "normal" : "bold"
          break
        case "italic":
          textObj.fontStyle = textObj.fontStyle === "italic" ? "normal" : "italic"
          break
        case "underline":
          textObj.underline = !textObj.underline
          break
      }
      canvas.renderAll()
    }
  }

  /**
   * Set text alignment
   */
  static setTextAlignment(
    canvas: fabric.Canvas,
    alignment: "left" | "center" | "right" | "justify"
  ) {
    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "text") {
      const textObj = activeObject as fabric.Text
      textObj.textAlign = alignment
      canvas.renderAll()
    }
  }

  /**
   * Set text color
   */
  static setTextColor(canvas: fabric.Canvas, color: string) {
    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "text") {
      const textObj = activeObject as fabric.Text
      textObj.set("fill", color)
      canvas.renderAll()
    }
  }

  /**
   * Set text font family
   */
  static setTextFont(canvas: fabric.Canvas, fontFamily: string) {
    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "text") {
      const textObj = activeObject as fabric.Text
      textObj.set("fontFamily", fontFamily)
      canvas.renderAll()
    }
  }

  /**
   * Set text font size
   */
  static setTextFontSize(canvas: fabric.Canvas, fontSize: number) {
    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "text") {
      const textObj = activeObject as fabric.Text
      textObj.set("fontSize", fontSize)
      canvas.renderAll()
    }
  }

  /**
   * Apply image filter
   */
  static applyImageFilter(
    canvas: fabric.Canvas,
    filterType: "brightness" | "contrast" | "saturation"
  ) {
    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "image") {
      // Image filters would be applied here
      // This is a placeholder - actual filter implementation depends on Fabric.js version
      canvas.renderAll()
    }
  }

  /**
   * Crop image
   */
  static cropImage(canvas: fabric.Canvas, x: number, y: number, width: number, height: number) {
    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "image") {
      const imgObj = activeObject as fabric.Image
      // Crop functionality would be implemented here
      canvas.renderAll()
    }
  }

  /**
   * Remove background from image (AI-powered)
   * Note: This would typically call a backend API for actual background removal
   */
  static async removeBackground(canvas: fabric.Canvas): Promise<void> {
    const activeObject = canvas.getActiveObject()
    if (activeObject && activeObject.type === "image") {
      // This would call an API to remove background
      // For now, just a placeholder
      canvas.renderAll()
    }
  }
}

