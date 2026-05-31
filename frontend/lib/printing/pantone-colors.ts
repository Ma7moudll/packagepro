"use client"

import { PantoneColor } from "./types"

/**
 * Pantone Color Matching System
 * This is a subset of Pantone colors. In production, use a complete Pantone database.
 */
export const PANTONE_COLORS: PantoneColor[] = [
  // Coated Colors
  {
    code: "PANTONE 19-1664 TPX",
    name: "True Red",
    hex: "#BF1932",
    rgb: { r: 191, g: 25, b: 50 },
    cmyk: { c: 0, m: 100, y: 75, k: 0 },
    category: "Coated",
  },
  {
    code: "PANTONE 18-1664 TCX",
    name: "Fiery Red",
    hex: "#D01C1F",
    rgb: { r: 208, g: 28, b: 31 },
    cmyk: { c: 0, m: 100, y: 85, k: 0 },
    category: "Coated",
  },
  {
    code: "PANTONE 19-4052 TPX",
    name: "Classic Blue",
    hex: "#0F4C75",
    rgb: { r: 15, g: 76, b: 117 },
    cmyk: { c: 100, m: 50, y: 0, k: 30 },
    category: "Coated",
  },
  {
    code: "PANTONE 15-0343 TCX",
    name: "Greenery",
    hex: "#88B04B",
    rgb: { r: 136, g: 176, b: 75 },
    cmyk: { c: 40, m: 0, y: 80, k: 0 },
    category: "Coated",
  },
  {
    code: "PANTONE 13-1520 TCX",
    name: "Rose Quartz",
    hex: "#F7CAC9",
    rgb: { r: 247, g: 202, b: 201 },
    cmyk: { c: 0, m: 25, y: 10, k: 0 },
    category: "Coated",
  },
  {
    code: "PANTONE 15-1264 TCX",
    name: "Peach Echo",
    hex: "#F7786B",
    rgb: { r: 247, g: 120, b: 107 },
    cmyk: { c: 0, m: 60, y: 50, k: 0 },
    category: "Coated",
  },
  {
    code: "PANTONE 19-4052 TCX",
    name: "Serenity",
    hex: "#92A8D1",
    rgb: { r: 146, g: 168, b: 209 },
    cmyk: { c: 40, m: 25, y: 0, k: 0 },
    category: "Coated",
  },
  {
    code: "PANTONE 18-3838 TCX",
    name: "Ultra Violet",
    hex: "#5F4B8B",
    rgb: { r: 95, g: 75, b: 139 },
    cmyk: { c: 60, m: 70, y: 0, k: 0 },
    category: "Coated",
  },
  {
    code: "PANTONE 17-2031 TCX",
    name: "Living Coral",
    hex: "#FF6F61",
    rgb: { r: 255, g: 111, b: 97 },
    cmyk: { c: 0, m: 60, y: 60, k: 0 },
    category: "Coated",
  },
  {
    code: "PANTONE 19-1664 TCX",
    name: "Illuminating",
    hex: "#F5DF4D",
    rgb: { r: 245, g: 223, b: 77 },
    cmyk: { c: 0, m: 10, y: 70, k: 0 },
    category: "Coated",
  },
  // Uncoated Colors
  {
    code: "PANTONE 19-1664 UP",
    name: "True Red (Uncoated)",
    hex: "#C41E3A",
    rgb: { r: 196, g: 30, b: 58 },
    cmyk: { c: 0, m: 100, y: 70, k: 0 },
    category: "Uncoated",
  },
  {
    code: "PANTONE 19-4052 UP",
    name: "Classic Blue (Uncoated)",
    hex: "#1E3A5F",
    rgb: { r: 30, g: 58, b: 95 },
    cmyk: { c: 100, m: 60, y: 0, k: 40 },
    category: "Uncoated",
  },
  // Metallic Colors
  {
    code: "PANTONE 19-1664 M",
    name: "Metallic Red",
    hex: "#B71C1C",
    rgb: { r: 183, g: 28, b: 28 },
    cmyk: { c: 0, m: 100, y: 85, k: 0 },
    category: "Metallic",
  },
  {
    code: "PANTONE 19-4052 M",
    name: "Metallic Blue",
    hex: "#0D47A1",
    rgb: { r: 13, g: 71, b: 161 },
    cmyk: { c: 100, m: 70, y: 0, k: 20 },
    category: "Metallic",
  },
]

/**
 * Find Pantone color by code
 */
export function findPantoneColor(code: string): PantoneColor | undefined {
  return PANTONE_COLORS.find((color) => color.code === code)
}

/**
 * Search Pantone colors by name
 */
export function searchPantoneColors(query: string): PantoneColor[] {
  const lowerQuery = query.toLowerCase()
  return PANTONE_COLORS.filter(
    (color) =>
      color.name.toLowerCase().includes(lowerQuery) ||
      color.code.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get Pantone colors by category
 */
export function getPantoneColorsByCategory(
  category: string
): PantoneColor[] {
  return PANTONE_COLORS.filter((color) => color.category === category)
}

/**
 * Convert RGB to closest Pantone color
 */
export function rgbToPantone(
  r: number,
  g: number,
  b: number
): PantoneColor | null {
  let closest: PantoneColor | null = null
  let minDistance = Infinity

  PANTONE_COLORS.forEach((color) => {
    const distance = Math.sqrt(
      Math.pow(color.rgb.r - r, 2) +
        Math.pow(color.rgb.g - g, 2) +
        Math.pow(color.rgb.b - b, 2)
    )

    if (distance < minDistance) {
      minDistance = distance
      closest = color
    }
  })

  return closest
}

/**
 * Convert HEX to closest Pantone color
 */
export function hexToPantone(hex: string): PantoneColor | null {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return rgbToPantone(r, g, b)
}

