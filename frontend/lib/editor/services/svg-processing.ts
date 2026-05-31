"use client"

export interface SVGLayer {
  id: string
  name: string
  type: "path" | "rect" | "circle" | "ellipse" | "line" | "polygon" | "polyline" | "text" | "group"
  attributes: Record<string, string>
  children?: SVGLayer[]
  dataUrl?: string // For complex SVGs converted to image
}

export interface ParsedSVG {
  width: number
  height: number
  viewBox?: string
  layers: SVGLayer[]
  optimized: string
}

/**
 * Parse SVG file and extract layers
 */
export async function parseSVG(file: File): Promise<ParsedSVG> {
  const text = await file.text()

  // NOTE:
  // svgo is a Node-only library (depends on fs/promises) and cannot run in the browser bundle.
  // To avoid Next.js build errors, we skip svgo optimization on the client and use
  // the raw SVG text as-is. Server-side optimization can be added later via an API route.
  const optimized = text

  // Parse SVG to extract elements
  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(optimized, "image/svg+xml")
  const svgElement = svgDoc.querySelector("svg")

  if (!svgElement) {
    throw new Error("Invalid SVG file")
  }

  // Extract dimensions
  const width = parseFloat(svgElement.getAttribute("width") || "0")
  const height = parseFloat(svgElement.getAttribute("height") || "0")
  const viewBox = svgElement.getAttribute("viewBox") || undefined

  // Extract layers
  const layers = extractSVGLayers(svgElement)

  return {
    width: width || 800, // Default if not specified
    height: height || 600,
    viewBox,
    layers,
    optimized,
  }
}

/**
 * Extract layers from SVG element
 */
function extractSVGLayers(element: Element, parentId = "root"): SVGLayer[] {
  const layers: SVGLayer[] = []
  let index = 0

  for (const child of Array.from(element.children)) {
    const tagName = child.tagName.toLowerCase()
    const id = child.getAttribute("id") || `${parentId}-${index++}`

    // Skip defs, style, script, etc.
    if (["defs", "style", "script", "metadata"].includes(tagName)) {
      continue
    }

    // Extract attributes
    const attributes: Record<string, string> = {}
    for (const attr of Array.from(child.attributes)) {
      attributes[attr.name] = attr.value
    }

    const layer: SVGLayer = {
      id,
      name: attributes.id || attributes["data-name"] || tagName,
      type: getSVGType(tagName),
      attributes,
    }

    // Recursively extract children for groups
    if (tagName === "g" || tagName === "svg") {
      layer.children = extractSVGLayers(child, id)
    }

    layers.push(layer)
  }

  return layers
}

/**
 * Get SVG element type
 */
function getSVGType(tagName: string): SVGLayer["type"] {
  const typeMap: Record<string, SVGLayer["type"]> = {
    path: "path",
    rect: "rect",
    circle: "circle",
    ellipse: "ellipse",
    line: "line",
    polygon: "polygon",
    polyline: "polyline",
    text: "text",
    g: "group",
  }

  return typeMap[tagName] || "path"
}

/**
 * Convert SVG to image data URL (for complex SVGs)
 */
export async function svgToImageDataURL(svgString: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const svgBlob = new Blob([svgString], { type: "image/svg+xml" })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0)
      const dataUrl = canvas.toDataURL("image/png")
      URL.revokeObjectURL(url)
      resolve(dataUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load SVG"))
    }

    img.src = url
  })
}

/**
 * Convert SVG layer to design layer
 */
export function svgLayerToDesignLayer(
  svgLayer: SVGLayer,
  faceId: string,
  position: { x: number; y: number } = { x: 100, y: 100 },
  svgDataUrl?: string
) {
  // For complex SVGs, use as image
  if (svgLayer.type === "group" || svgDataUrl) {
    return {
      type: "image" as const,
      name: svgLayer.name,
      visible: true,
      locked: false,
      opacity: parseFloat(svgLayer.attributes.opacity || "1"),
      blendMode: "normal" as const,
      position,
      rotation: 0,
      scale: { x: 1, y: 1 },
      faceId: faceId as any,
      imageProperties: {
        src: svgDataUrl || "",
      },
    }
  }

  // For simple shapes, convert to shape layer
  const fill = svgLayer.attributes.fill || svgLayer.attributes["fill-color"] || "#000000"
  const stroke = svgLayer.attributes.stroke || ""
  const strokeWidth = parseFloat(svgLayer.attributes["stroke-width"] || "0")

  let shape: "rect" | "circle" | "path" = "rect"
  if (svgLayer.type === "circle" || svgLayer.type === "ellipse") {
    shape = "circle"
  } else if (svgLayer.type === "path") {
    shape = "path"
  }

  return {
    type: "shape" as const,
    name: svgLayer.name,
    visible: true,
    locked: false,
    opacity: parseFloat(svgLayer.attributes.opacity || "1"),
    blendMode: "normal" as const,
    position,
    rotation: 0,
    scale: { x: 1, y: 1 },
    faceId: faceId as any,
    shapeProperties: {
      shape,
      fill,
      stroke,
      strokeWidth,
    },
  }
}

