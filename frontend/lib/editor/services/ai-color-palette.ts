"use client"

import { colord, Colord } from "colord"
import tinycolor from "tinycolor2"

export interface ColorPalette {
  dominant: string
  colors: string[]
  complementary: string
  analogous: string[]
  triadic: string[]
  shades: string[]
  tints: string[]
}

/**
 * Generate color palette from image
 */
export async function generateColorPaletteFromImage(imageFile: File): Promise<ColorPalette> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const colors = extractColors(imageData)

      const dominant = colors[0] || "#000000"
      const palette = generatePalette(dominant, colors)

      resolve(palette)
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(imageFile)
  })
}

/**
 * Generate color palette from a base color
 */
export function generatePaletteFromColor(baseColor: string): ColorPalette {
  return generatePalette(baseColor, [baseColor])
}

/**
 * Extract dominant colors from image data
 */
function extractColors(imageData: ImageData, maxColors: number = 10): string[] {
  const colorMap = new Map<string, number>()
  const data = imageData.data

  // Sample pixels (every 10th pixel for performance)
  for (let i = 0; i < data.length; i += 40) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    // Skip transparent pixels
    if (a < 128) continue

    // Quantize colors to reduce noise
    const qr = Math.floor(r / 32) * 32
    const qg = Math.floor(g / 32) * 32
    const qb = Math.floor(b / 32) * 32
    const key = `${qr},${qg},${qb}`

    colorMap.set(key, (colorMap.get(key) || 0) + 1)
  }

  // Sort by frequency and convert to hex
  const sorted = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([key]) => {
      const [r, g, b] = key.split(",").map(Number)
      return rgbToHex(r, g, b)
    })

  return sorted
}

/**
 * Generate full palette from base color
 */
function generatePalette(baseColor: string, extractedColors: string[]): ColorPalette {
  const color = colord(baseColor)
  const tinyColor = tinycolor(baseColor)

  // Complementary
  const complementary = color.rotate(180).toHex()

  // Analogous (30° apart)
  const analogous = [
    color.rotate(-30).toHex(),
    color.rotate(30).toHex(),
  ]

  // Triadic (120° apart)
  const triadic = [
    color.rotate(120).toHex(),
    color.rotate(240).toHex(),
  ]

  // Shades (darker)
  const shades = [
    color.darken(0.2).toHex(),
    color.darken(0.4).toHex(),
    color.darken(0.6).toHex(),
  ]

  // Tints (lighter)
  const tints = [
    color.lighten(0.2).toHex(),
    color.lighten(0.4).toHex(),
    color.lighten(0.6).toHex(),
  ]

  return {
    dominant: baseColor,
    colors: extractedColors,
    complementary,
    analogous,
    triadic,
    shades,
    tints,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`
}

