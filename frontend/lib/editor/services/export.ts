"use client"

import { useDesignStore } from "@/lib/editor/state/store"
import { Layer, ModelState } from "@/lib/editor/state/types"
import { generateTextureFromLayers } from "./texture-generator"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export interface ExportOptions {
  format: "pdf" | "png" | "jpg" | "svg" | "ai" | "eps"
  resolution: 72 | 150 | 300 | 600 // DPI
  colorMode: "rgb" | "cmyk"
  includeBleed: boolean
  bleedSize: number // mm
  includeCropMarks: boolean
  includeDieLines: boolean
  flattenLayers: boolean
}

const defaultExportOptions: ExportOptions = {
  format: "pdf",
  resolution: 300,
  colorMode: "rgb",
  includeBleed: true,
  bleedSize: 3, // 3mm standard
  includeCropMarks: true,
  includeDieLines: false,
  flattenLayers: true,
}

export async function exportDesign(options: Partial<ExportOptions> = {}): Promise<Blob | null> {
  const opts = { ...defaultExportOptions, ...options }
  const state = useDesignStore.getState()
  const layers = state.layers.filter((l) => l.visible)
  const model = state.model

  if (opts.format === "pdf") {
    return await exportPDF(layers, model, opts)
  } else if (opts.format === "png" || opts.format === "jpg") {
    return await exportImage(layers, model, opts)
  } else if (opts.format === "svg") {
    return await exportSVG(layers, model, opts)
  }

  // ai/eps are not implemented; callers must not offer them
  return null
}

async function exportSVG(
  layers: Layer[],
  model: ModelState,
  options: ExportOptions
): Promise<Blob> {
  const textures = await generateTextureFromLayers(layers, model, {
    width: (options.resolution / 72) * 800,
    height: (options.resolution / 72) * 600,
    includeEmptyFaces: true,
    backgroundColor: useDesignStore.getState().canvas.backgroundColor,
  })

  const bleed = options.includeBleed ? options.bleedSize : 0
  const margin = 10 // mm
  const gap = 20 // mm between faces
  const markLength = 5 // mm

  // Face artwork is embedded as PNG; crop marks, die lines and labels stay
  // vector so the file remains editable for print preparation.
  const parts: string[] = []
  let y = margin
  let maxW = 0

  for (const face of model.faces) {
    const dataUrl = textures[face.id]
    if (!dataUrl) continue

    const faceWidth = face.id === "front" || face.id === "back" ? model.dimensions.length : model.dimensions.width
    const faceHeight = model.dimensions.height
    const totalWidth = faceWidth + bleed * 2
    const totalHeight = faceHeight + bleed * 2
    maxW = Math.max(maxW, totalWidth + margin * 2)

    const label = `<text x="${margin}" y="${y - 2}" font-size="3" fill="#000">${escapeXml(face.name)}</text>`
    const image = `<image href="${dataUrl}" x="${margin}" y="${y}" width="${totalWidth}" height="${totalHeight}" />`

    let marks = ""
    if (options.includeCropMarks) {
      const x = margin
      const stroke = `stroke="#000" stroke-width="0.1"`
      marks =
        `<line x1="${x - bleed}" y1="${y - bleed}" x2="${x - bleed}" y2="${y - bleed - markLength}" ${stroke}/>` +
        `<line x1="${x - bleed}" y1="${y - bleed}" x2="${x - bleed - markLength}" y2="${y - bleed}" ${stroke}/>` +
        `<line x1="${x + totalWidth + bleed}" y1="${y - bleed}" x2="${x + totalWidth + bleed}" y2="${y - bleed - markLength}" ${stroke}/>` +
        `<line x1="${x + totalWidth + bleed}" y1="${y - bleed}" x2="${x + totalWidth + bleed + markLength}" y2="${y - bleed}" ${stroke}/>` +
        `<line x1="${x - bleed}" y1="${y + totalHeight + bleed}" x2="${x - bleed}" y2="${y + totalHeight + bleed + markLength}" ${stroke}/>` +
        `<line x1="${x - bleed}" y1="${y + totalHeight + bleed}" x2="${x - bleed - markLength}" y2="${y + totalHeight + bleed}" ${stroke}/>` +
        `<line x1="${x + totalWidth + bleed}" y1="${y + totalHeight + bleed}" x2="${x + totalWidth + bleed}" y2="${y + totalHeight + bleed + markLength}" ${stroke}/>` +
        `<line x1="${x + totalWidth + bleed}" y1="${y + totalHeight + bleed}" x2="${x + totalWidth + bleed + markLength}" y2="${y + totalHeight + bleed}" ${stroke}/>`
    }

    let die = ""
    if (options.includeDieLines) {
      die =
        `<rect x="${margin}" y="${y}" width="${totalWidth}" height="${totalHeight}" fill="none" stroke="#FF0000" stroke-width="0.1" stroke-dasharray="2,2"/>` +
        `<rect x="${margin - bleed}" y="${y - bleed}" width="${totalWidth + bleed * 2}" height="${totalHeight + bleed * 2}" fill="none" stroke="#0000FF" stroke-width="0.1" stroke-dasharray="2,2"/>`
    }

    parts.push(label + image + marks + die)
    y += totalHeight + gap
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${maxW}mm" height="${y - gap + margin}mm" viewBox="0 0 ${maxW} ${y - gap + margin}">${parts.join("")}</svg>`
  return new Blob([svg], { type: "image/svg+xml" })
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

async function exportPDF(
  layers: Layer[],
  model: ModelState,
  options: ExportOptions
): Promise<Blob> {
  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  })

  // Add metadata
  pdf.setProperties({
    title: "PackagePro Design Export",
    subject: "Print-ready packaging design",
    author: "PackagePro",
    keywords: "packaging, print, design",
    creator: "PackagePro Editor v1.0",
  })

  // Generate textures for each face
  const textures = await generateTextureFromLayers(layers, model, {
    width: (options.resolution / 72) * 800, // Scale based on DPI
    height: (options.resolution / 72) * 600,
    includeEmptyFaces: true,
    backgroundColor: useDesignStore.getState().canvas.backgroundColor,
  })

  // Export each face
  for (let i = 0; i < model.faces.length; i++) {
    const face = model.faces[i]
    const textureDataUrl = textures[face.id]

    if (textureDataUrl) {
      // Calculate dimensions with bleed
      const faceWidth = face.id === "front" || face.id === "back" ? model.dimensions.length : model.dimensions.width
      const faceHeight = model.dimensions.height
      const bleed = options.includeBleed ? options.bleedSize : 0
      const totalWidth = faceWidth + bleed * 2
      const totalHeight = faceHeight + bleed * 2

      // Add image to PDF
      pdf.addImage(
        textureDataUrl,
        "PNG",
        (210 - totalWidth) / 2, // Center on A4 (210mm width)
        (297 - totalHeight) / 2 + i * 50, // Stack vertically with spacing
        totalWidth,
        totalHeight,
        undefined,
        "FAST"
      )

      // Add crop marks if requested
      if (options.includeCropMarks) {
        const x = (210 - totalWidth) / 2
        const y = (297 - totalHeight) / 2 + i * 50
        addCropMarks(pdf, x, y, totalWidth, totalHeight, bleed)
      }

      // Add die lines if requested
      if (options.includeDieLines) {
        const x = (210 - totalWidth) / 2
        const y = (297 - totalHeight) / 2 + i * 50
        addDieLines(pdf, x, y, faceWidth, faceHeight, bleed)
      }

      // Add face label
      pdf.setFontSize(8)
      pdf.text(face.name, 10, (297 - totalHeight) / 2 + i * 50 - 5)
    }

    // New page for next face (except last)
    if (i < model.faces.length - 1) {
      pdf.addPage()
    }
  }

  return pdf.output("blob")
}

async function exportImage(
  layers: Layer[],
  model: ModelState,
  options: ExportOptions
): Promise<Blob> {
  // For now, export the first face as image
  // In a full implementation, you'd export all faces or create a composite
  const textures = await generateTextureFromLayers(layers, model, {
    width: (options.resolution / 72) * 800,
    height: (options.resolution / 72) * 600,
    includeEmptyFaces: true,
    backgroundColor: useDesignStore.getState().canvas.backgroundColor,
  })

  const firstFace = model.faces[0]
  const textureDataUrl = textures[firstFace.id]

  if (!textureDataUrl) {
    throw new Error("No texture data available")
  }

  // Convert data URL to blob
  const response = await fetch(textureDataUrl)
  const blob = await response.blob()

  return blob
}

function addCropMarks(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  bleed: number
) {
  const markLength = 5 // mm
  const markWidth = 0.1 // mm

  pdf.setDrawColor(0, 0, 0)
  pdf.setLineWidth(markWidth)

  // Top-left
  pdf.line(x - bleed, y - bleed, x - bleed, y - bleed - markLength)
  pdf.line(x - bleed, y - bleed, x - bleed - markLength, y - bleed)

  // Top-right
  pdf.line(x + width + bleed, y - bleed, x + width + bleed, y - bleed - markLength)
  pdf.line(x + width + bleed, y - bleed, x + width + bleed + markLength, y - bleed)

  // Bottom-left
  pdf.line(x - bleed, y + height + bleed, x - bleed, y + height + bleed + markLength)
  pdf.line(x - bleed, y + height + bleed, x - bleed - markLength, y + height + bleed)

  // Bottom-right
  pdf.line(
    x + width + bleed,
    y + height + bleed,
    x + width + bleed,
    y + height + bleed + markLength
  )
  pdf.line(
    x + width + bleed,
    y + height + bleed,
    x + width + bleed + markLength,
    y + height + bleed
  )
}

function addDieLines(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  bleed: number
) {
  pdf.setDrawColor(255, 0, 0) // Red for die lines
  pdf.setLineWidth(0.1)
  pdf.setLineDashPattern([2, 2], 0)

  // Draw die line rectangle (cut line)
  pdf.rect(x, y, width, height)

  // Draw bleed area outline
  pdf.setDrawColor(0, 0, 255) // Blue for bleed
  pdf.rect(x - bleed, y - bleed, width + bleed * 2, height + bleed * 2)

  pdf.setLineDashPattern([], 0) // Reset to solid
}

export async function export3DPreviews(): Promise<Record<string, string>> {
  // This would capture screenshots from the 3D canvas
  // For now, return empty object - would need Three.js renderer access
  return {}
}

