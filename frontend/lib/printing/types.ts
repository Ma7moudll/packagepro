"use client"

export interface DieCutLine {
  id: string
  type: "cut" | "perforation" | "score"
  points: Array<{ x: number; y: number }>
  closed: boolean
  color: string
  thickness: number
}

export interface FoldLine {
  id: string
  type: "fold" | "mountain" | "valley"
  start: { x: number; y: number }
  end: { x: number; y: number }
  angle: number
  color: string
  thickness: number
}

export interface SpotUV {
  id: string
  type: "spot_uv" | "foil_stamping" | "gloss" | "matte"
  area: {
    type: "rectangle" | "circle" | "polygon" | "path"
    coordinates: Array<{ x: number; y: number }>
  }
  color?: string
  opacity: number
  preview: boolean
}

export interface EmbossingDebossing {
  id: string
  type: "emboss" | "deboss"
  area: {
    type: "rectangle" | "circle" | "polygon" | "path"
    coordinates: Array<{ x: number; y: number }>
  }
  depth: number
  preview: boolean
}

export interface PantoneColor {
  code: string
  name: string
  hex: string
  rgb: { r: number; g: number; b: number }
  cmyk: { c: number; m: number; y: number; k: number }
  category: string
}

export interface PrintQuote {
  quantity: number
  dimensions: {
    width: number
    height: number
    depth?: number
    unit: "mm" | "cm" | "inch"
  }
  material: string
  finish: string[]
  colors: {
    front: number
    back: number
    sides: number
  }
  dieCutLines: number
  foldLines: number
  spotUV: number
  embossing: number
  debossing: number
  pantoneColors: string[]
  rushOrder: boolean
  deliveryDate?: string
  basePrice: number
  materialCost: number
  colorCost: number
  finishCost: number
  specialEffectsCost: number
  rushCost: number
  tax: number
  total: number
  currency: string
}

