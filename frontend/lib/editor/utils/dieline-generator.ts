"use client"

import { ModelDimensions, ProductType, FaceId } from "../state/types"

export interface DielineFace {
  id: FaceId
  x: number
  y: number
  width: number
  height: number
  label: string
  color: string
  isFlap?: boolean
}

export interface DielineConfig {
  width: number
  height: number
  faces: DielineFace[]
  cutLines: { x1: number; y1: number; x2: number; y2: number }[]
  foldLines: { x1: number; y1: number; x2: number; y2: number }[]
}

// Generate dieline configuration based on product type and dimensions
export function generateDieline(
  productType: ProductType,
  dimensions: ModelDimensions
): DielineConfig {
  const { length: l, width: w, height: h } = dimensions
  const scale = 0.5 // Scale factor for display

  // Scaled dimensions
  const sl = l * scale
  const sw = w * scale
  const sh = h * scale

  // Common flap sizes
  const flapHeight = Math.min(sw * 0.7, 40 * scale)
  const glueTab = 15 * scale

  switch (productType) {
    case "mailer_box":
    case "ecommerce_mailer_box":
    case "christmas_gift_box":
      return generateMailerBoxDieline(sl, sw, sh, flapHeight, glueTab)

    case "shipping_box":
      return generateShippingBoxDieline(sl, sw, sh, flapHeight, glueTab)

    case "rigid_box":
    case "rigid_magnetic_box":
    case "gift_box":
      return generateRigidBoxDieline(sl, sw, sh, flapHeight)

    case "folding_carton":
    case "snap_lock_box":
      return generateFoldingCartonDieline(sl, sw, sh, flapHeight, glueTab)

    case "pizza_box":
      return generatePizzaBoxDieline(sl, sw, sh, flapHeight)

    case "pillow_box":
      return generatePillowBoxDieline(sl, sw, sh)

    default:
      return generateMailerBoxDieline(sl, sw, sh, flapHeight, glueTab)
  }
}

// Mailer Box Dieline (Tuck-end)
function generateMailerBoxDieline(
  l: number,
  w: number,
  h: number,
  flapHeight: number,
  glueTab: number
): DielineConfig {
  const padding = 20
  const faces: DielineFace[] = []
  const cutLines: DielineConfig["cutLines"] = []
  const foldLines: DielineConfig["foldLines"] = []

  // Calculate total dimensions
  const totalWidth = l * 2 + w * 2 + glueTab + padding * 2
  const totalHeight = h * 2 + w * 2 + flapHeight * 2 + padding * 2

  // Starting positions
  const startX = padding + glueTab
  const startY = padding + flapHeight + w

  // Glue tab
  faces.push({
    id: "left",
    x: padding,
    y: startY,
    width: glueTab,
    height: h,
    label: "Glue Tab",
    color: "#e2e8f0",
    isFlap: true,
  })

  // Left panel (side)
  faces.push({
    id: "left",
    x: startX,
    y: startY,
    width: w,
    height: h,
    label: "Left",
    color: "#f1f5f9",
  })

  // Bottom panel
  faces.push({
    id: "bottom",
    x: startX + w,
    y: startY,
    width: l,
    height: h,
    label: "Bottom",
    color: "#f8fafc",
  })

  // Right panel (side)
  faces.push({
    id: "right",
    x: startX + w + l,
    y: startY,
    width: w,
    height: h,
    label: "Right",
    color: "#f1f5f9",
  })

  // Top panel
  faces.push({
    id: "top",
    x: startX + w * 2 + l,
    y: startY,
    width: l,
    height: h,
    label: "Top",
    color: "#f8fafc",
  })

  // Front flap (bottom)
  faces.push({
    id: "front",
    x: startX + w,
    y: startY + h,
    width: l,
    height: w,
    label: "Front",
    color: "#e2e8f0",
  })

  // Back flap (top)
  faces.push({
    id: "back",
    x: startX + w,
    y: startY - w,
    width: l,
    height: w,
    label: "Back",
    color: "#e2e8f0",
  })

  // Top tuck flap
  faces.push({
    id: "inside_top",
    x: startX + w + l * 0.1,
    y: startY - w - flapHeight,
    width: l * 0.8,
    height: flapHeight,
    label: "Tuck",
    color: "#cbd5e1",
    isFlap: true,
  })

  // Bottom tuck flap
  faces.push({
    id: "inside_bottom",
    x: startX + w + l * 0.1,
    y: startY + h + w,
    width: l * 0.8,
    height: flapHeight,
    label: "Tuck",
    color: "#cbd5e1",
    isFlap: true,
  })

  // Side flaps
  faces.push({
    id: "inside_left",
    x: startX,
    y: startY - w,
    width: w,
    height: w * 0.6,
    label: "Flap",
    color: "#cbd5e1",
    isFlap: true,
  })
  faces.push({
    id: "inside_right",
    x: startX + w + l,
    y: startY - w,
    width: w,
    height: w * 0.6,
    label: "Flap",
    color: "#cbd5e1",
    isFlap: true,
  })
  faces.push({
    id: "inside_left",
    x: startX,
    y: startY + h,
    width: w,
    height: w * 0.6,
    label: "Flap",
    color: "#cbd5e1",
    isFlap: true,
  })
  faces.push({
    id: "inside_right",
    x: startX + w + l,
    y: startY + h,
    width: w,
    height: w * 0.6,
    label: "Flap",
    color: "#cbd5e1",
    isFlap: true,
  })

  // Cut lines (outer border)
  // Top section
  cutLines.push({ x1: startX, y1: startY - w - flapHeight, x2: startX + w + l * 0.1, y2: startY - w - flapHeight })
  cutLines.push({ x1: startX + w + l * 0.9, y1: startY - w - flapHeight, x2: startX + w * 2 + l, y2: startY - w - flapHeight })

  // Fold lines
  // Main horizontal folds
  foldLines.push({ x1: padding, y1: startY, x2: totalWidth - padding, y2: startY })
  foldLines.push({ x1: padding, y1: startY + h, x2: totalWidth - padding, y2: startY + h })
  foldLines.push({ x1: startX + w, y1: startY - w, x2: startX + w + l, y2: startY - w })
  foldLines.push({ x1: startX + w, y1: startY + h + w, x2: startX + w + l, y2: startY + h + w })

  // Main vertical folds
  foldLines.push({ x1: startX, y1: startY - w, x2: startX, y2: startY + h + w })
  foldLines.push({ x1: startX + w, y1: startY - w - flapHeight, x2: startX + w, y2: startY + h + w + flapHeight })
  foldLines.push({ x1: startX + w + l, y1: startY - w - flapHeight, x2: startX + w + l, y2: startY + h + w + flapHeight })
  foldLines.push({ x1: startX + w * 2 + l, y1: startY - w, x2: startX + w * 2 + l, y2: startY + h + w })

  return {
    width: totalWidth,
    height: totalHeight,
    faces,
    cutLines,
    foldLines,
  }
}

// Shipping Box Dieline (RSC)
function generateShippingBoxDieline(
  l: number,
  w: number,
  h: number,
  flapHeight: number,
  glueTab: number
): DielineConfig {
  const padding = 20
  const faces: DielineFace[] = []
  const cutLines: DielineConfig["cutLines"] = []
  const foldLines: DielineConfig["foldLines"] = []

  const flapWidth = w / 2

  const totalWidth = l * 2 + w * 2 + glueTab + padding * 2
  const totalHeight = h + flapWidth * 2 + padding * 2

  const startX = padding + glueTab
  const startY = padding + flapWidth

  // Glue tab
  faces.push({
    id: "left",
    x: padding,
    y: startY,
    width: glueTab,
    height: h,
    label: "Glue",
    color: "#e2e8f0",
    isFlap: true,
  })

  // Main panels
  const panels = [
    { id: "left" as FaceId, x: startX, w: w, label: "Left" },
    { id: "front" as FaceId, x: startX + w, w: l, label: "Front" },
    { id: "right" as FaceId, x: startX + w + l, w: w, label: "Right" },
    { id: "back" as FaceId, x: startX + w * 2 + l, w: l, label: "Back" },
  ]

  panels.forEach((panel) => {
    // Main panel
    faces.push({
      id: panel.id,
      x: panel.x,
      y: startY,
      width: panel.w,
      height: h,
      label: panel.label,
      color: "#f8fafc",
    })

    // Top flap
    faces.push({
      id: `inside_${panel.id}` as FaceId,
      x: panel.x,
      y: startY - flapWidth,
      width: panel.w,
      height: flapWidth,
      label: "Top Flap",
      color: "#e2e8f0",
      isFlap: true,
    })

    // Bottom flap
    faces.push({
      id: `inside_${panel.id}` as FaceId,
      x: panel.x,
      y: startY + h,
      width: panel.w,
      height: flapWidth,
      label: "Bottom Flap",
      color: "#e2e8f0",
      isFlap: true,
    })
  })

  // Fold lines
  foldLines.push({ x1: padding, y1: startY, x2: totalWidth - padding, y2: startY })
  foldLines.push({ x1: padding, y1: startY + h, x2: totalWidth - padding, y2: startY + h })

  panels.forEach((panel) => {
    foldLines.push({ x1: panel.x, y1: padding, x2: panel.x, y2: totalHeight - padding })
  })

  return {
    width: totalWidth,
    height: totalHeight,
    faces,
    cutLines,
    foldLines,
  }
}

// Rigid Box Dieline (Two-piece)
function generateRigidBoxDieline(
  l: number,
  w: number,
  h: number,
  flapHeight: number
): DielineConfig {
  const padding = 30
  const faces: DielineFace[] = []
  const foldLines: DielineConfig["foldLines"] = []

  // Base dimensions
  const baseW = l + h * 2
  const baseH = w + h * 2

  // Lid dimensions (slightly larger)
  const lidW = l + h * 2 + 4
  const lidH = w + h * 2 + 4
  const lidHeight = h * 0.3

  const totalWidth = Math.max(baseW, lidW) + padding * 3 + baseW
  const totalHeight = Math.max(baseH, lidH) + padding * 2

  // Base
  faces.push({
    id: "bottom",
    x: padding + h,
    y: padding + h,
    width: l,
    height: w,
    label: "Base",
    color: "#f8fafc",
  })

  // Base sides
  faces.push({
    id: "front",
    x: padding + h,
    y: padding,
    width: l,
    height: h,
    label: "Front",
    color: "#e2e8f0",
    isFlap: true,
  })
  faces.push({
    id: "back",
    x: padding + h,
    y: padding + h + w,
    width: l,
    height: h,
    label: "Back",
    color: "#e2e8f0",
    isFlap: true,
  })
  faces.push({
    id: "left",
    x: padding,
    y: padding + h,
    width: h,
    height: w,
    label: "Left",
    color: "#e2e8f0",
    isFlap: true,
  })
  faces.push({
    id: "right",
    x: padding + h + l,
    y: padding + h,
    width: h,
    height: w,
    label: "Right",
    color: "#e2e8f0",
    isFlap: true,
  })

  // Lid
  const lidStartX = padding * 2 + baseW + lidHeight
  faces.push({
    id: "top",
    x: lidStartX,
    y: padding + lidHeight,
    width: l + 4,
    height: w + 4,
    label: "Lid",
    color: "#f8fafc",
  })

  // Lid sides
  faces.push({
    id: "inside_front",
    x: lidStartX,
    y: padding,
    width: l + 4,
    height: lidHeight,
    label: "Lid Front",
    color: "#cbd5e1",
    isFlap: true,
  })
  faces.push({
    id: "inside_back",
    x: lidStartX,
    y: padding + lidHeight + w + 4,
    width: l + 4,
    height: lidHeight,
    label: "Lid Back",
    color: "#cbd5e1",
    isFlap: true,
  })
  faces.push({
    id: "inside_left",
    x: lidStartX - lidHeight,
    y: padding + lidHeight,
    width: lidHeight,
    height: w + 4,
    label: "Lid Left",
    color: "#cbd5e1",
    isFlap: true,
  })
  faces.push({
    id: "inside_right",
    x: lidStartX + l + 4,
    y: padding + lidHeight,
    width: lidHeight,
    height: w + 4,
    label: "Lid Right",
    color: "#cbd5e1",
    isFlap: true,
  })

  // Fold lines for base
  foldLines.push({ x1: padding, y1: padding + h, x2: padding + baseW, y2: padding + h })
  foldLines.push({ x1: padding, y1: padding + h + w, x2: padding + baseW, y2: padding + h + w })
  foldLines.push({ x1: padding + h, y1: padding, x2: padding + h, y2: padding + baseH })
  foldLines.push({ x1: padding + h + l, y1: padding, x2: padding + h + l, y2: padding + baseH })

  // Fold lines for lid
  foldLines.push({ x1: lidStartX - lidHeight, y1: padding + lidHeight, x2: lidStartX + l + 4 + lidHeight, y2: padding + lidHeight })
  foldLines.push({ x1: lidStartX - lidHeight, y1: padding + lidHeight + w + 4, x2: lidStartX + l + 4 + lidHeight, y2: padding + lidHeight + w + 4 })
  foldLines.push({ x1: lidStartX, y1: padding, x2: lidStartX, y2: padding + lidH })
  foldLines.push({ x1: lidStartX + l + 4, y1: padding, x2: lidStartX + l + 4, y2: padding + lidH })

  return {
    width: totalWidth,
    height: totalHeight,
    faces,
    cutLines: [],
    foldLines,
  }
}

// Folding Carton Dieline
function generateFoldingCartonDieline(
  l: number,
  w: number,
  h: number,
  flapHeight: number,
  glueTab: number
): DielineConfig {
  const padding = 20
  const faces: DielineFace[] = []
  const foldLines: DielineConfig["foldLines"] = []

  const totalWidth = l * 2 + w * 2 + glueTab + padding * 2
  const totalHeight = h + flapHeight * 2 + padding * 2

  const startX = padding + glueTab
  const startY = padding + flapHeight

  // Glue tab
  faces.push({
    id: "left",
    x: padding,
    y: startY,
    width: glueTab,
    height: h,
    label: "Glue",
    color: "#e2e8f0",
    isFlap: true,
  })

  // Main panels (vertical arrangement)
  faces.push({
    id: "left",
    x: startX,
    y: startY,
    width: w,
    height: h,
    label: "Left",
    color: "#f1f5f9",
  })
  faces.push({
    id: "front",
    x: startX + w,
    y: startY,
    width: l,
    height: h,
    label: "Front",
    color: "#f8fafc",
  })
  faces.push({
    id: "right",
    x: startX + w + l,
    y: startY,
    width: w,
    height: h,
    label: "Right",
    color: "#f1f5f9",
  })
  faces.push({
    id: "back",
    x: startX + w * 2 + l,
    y: startY,
    width: l,
    height: h,
    label: "Back",
    color: "#f8fafc",
  })

  // Top flaps
  faces.push({
    id: "top",
    x: startX + w,
    y: startY - flapHeight,
    width: l,
    height: flapHeight,
    label: "Top",
    color: "#e2e8f0",
    isFlap: true,
  })

  // Bottom flaps
  faces.push({
    id: "bottom",
    x: startX + w,
    y: startY + h,
    width: l,
    height: flapHeight,
    label: "Bottom",
    color: "#e2e8f0",
    isFlap: true,
  })

  // Fold lines
  foldLines.push({ x1: padding, y1: startY, x2: totalWidth - padding, y2: startY })
  foldLines.push({ x1: padding, y1: startY + h, x2: totalWidth - padding, y2: startY + h })

  const panels = [startX, startX + w, startX + w + l, startX + w * 2 + l, startX + w * 2 + l * 2]
  panels.forEach((x) => {
    foldLines.push({ x1: x, y1: padding, x2: x, y2: totalHeight - padding })
  })

  return {
    width: totalWidth,
    height: totalHeight,
    faces,
    cutLines: [],
    foldLines,
  }
}

// Pizza Box Dieline
function generatePizzaBoxDieline(
  l: number,
  w: number,
  h: number,
  flapHeight: number
): DielineConfig {
  const padding = 20
  const faces: DielineFace[] = []
  const foldLines: DielineConfig["foldLines"] = []

  const totalWidth = l + h * 2 + padding * 2
  const totalHeight = w + h * 2 + l + padding * 2

  const startX = padding + h
  const startY = padding + h

  // Base
  faces.push({
    id: "bottom",
    x: startX,
    y: startY,
    width: l,
    height: w,
    label: "Base",
    color: "#f8fafc",
  })

  // Sides
  faces.push({
    id: "front",
    x: startX,
    y: padding,
    width: l,
    height: h,
    label: "Front",
    color: "#e2e8f0",
    isFlap: true,
  })
  faces.push({
    id: "back",
    x: startX,
    y: startY + w,
    width: l,
    height: h,
    label: "Back (Hinge)",
    color: "#e2e8f0",
    isFlap: true,
  })
  faces.push({
    id: "left",
    x: padding,
    y: startY,
    width: h,
    height: w,
    label: "Left",
    color: "#e2e8f0",
    isFlap: true,
  })
  faces.push({
    id: "right",
    x: startX + l,
    y: startY,
    width: h,
    height: w,
    label: "Right",
    color: "#e2e8f0",
    isFlap: true,
  })

  // Lid (attached to back)
  faces.push({
    id: "top",
    x: startX,
    y: startY + w + h,
    width: l,
    height: l,
    label: "Lid",
    color: "#f8fafc",
  })

  // Lid front flap
  faces.push({
    id: "inside_front",
    x: startX + l * 0.1,
    y: startY + w + h + l,
    width: l * 0.8,
    height: h * 0.6,
    label: "Lid Lock",
    color: "#cbd5e1",
    isFlap: true,
  })

  // Fold lines
  foldLines.push({ x1: padding, y1: startY, x2: totalWidth - padding, y2: startY })
  foldLines.push({ x1: padding, y1: startY + w, x2: totalWidth - padding, y2: startY + w })
  foldLines.push({ x1: startX, y1: startY + w + h, x2: startX + l, y2: startY + w + h })
  foldLines.push({ x1: startX, y1: padding, x2: startX, y2: startY + w + h + l })
  foldLines.push({ x1: startX + l, y1: padding, x2: startX + l, y2: startY + w + h + l })

  return {
    width: totalWidth,
    height: totalHeight,
    faces,
    cutLines: [],
    foldLines,
  }
}

// Pillow Box Dieline
function generatePillowBoxDieline(
  l: number,
  w: number,
  h: number
): DielineConfig {
  const padding = 20
  const faces: DielineFace[] = []
  const foldLines: DielineConfig["foldLines"] = []

  // Pillow box uses curved ends
  const curveDepth = w * 0.3
  const totalWidth = l + padding * 2
  const totalHeight = w * 2 + curveDepth * 4 + padding * 2

  const startX = padding
  const startY = padding + curveDepth

  // Main body panels
  faces.push({
    id: "front",
    x: startX,
    y: startY,
    width: l,
    height: w,
    label: "Front",
    color: "#f8fafc",
  })
  faces.push({
    id: "back",
    x: startX,
    y: startY + w,
    width: l,
    height: w,
    label: "Back",
    color: "#f1f5f9",
  })

  // Curved flaps (represented as rectangles with curve indicator)
  faces.push({
    id: "top",
    x: startX,
    y: startY - curveDepth,
    width: l,
    height: curveDepth,
    label: "Curve",
    color: "#e2e8f0",
    isFlap: true,
  })
  faces.push({
    id: "bottom",
    x: startX,
    y: startY + w * 2,
    width: l,
    height: curveDepth,
    label: "Curve",
    color: "#e2e8f0",
    isFlap: true,
  })

  // Fold lines
  foldLines.push({ x1: startX, y1: startY, x2: startX + l, y2: startY })
  foldLines.push({ x1: startX, y1: startY + w, x2: startX + l, y2: startY + w })
  foldLines.push({ x1: startX, y1: startY + w * 2, x2: startX + l, y2: startY + w * 2 })

  return {
    width: totalWidth,
    height: totalHeight,
    faces,
    cutLines: [],
    foldLines,
  }
}
