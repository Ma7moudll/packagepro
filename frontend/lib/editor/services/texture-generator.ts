import { Layer, Face, ModelState, ModelDimensions } from "@/lib/editor/state/types"
import { TEXTURE_PX_PER_MM, pxToMm } from "@/lib/editor/geometry/units"

interface TextureOptions {
  scale?: number
  backgroundColor?: string
  width?: number
  height?: number
  // Exports set this: every face is rendered (artboard filled with
  // backgroundColor) so downloaded files never come out empty. The 3D
  // preview leaves it off so empty faces keep the raw board material.
  includeEmptyFaces?: boolean
}

export function getFaceDimensions(faceId: string, dimensions: ModelDimensions) {
  const { length, width, height } = dimensions
  // Normalize faceId if it's internal
  const id = faceId.replace("inside_", "")

  switch (id) {
    case "front":
    case "back":
      return { width: length, height: height }
    case "top":
    case "bottom":
      return { width: length, height: width }
    case "left":
    case "right":
      return { width: width, height: height }
    default:
      return { width: length, height: height }
  }
}

export async function generateTextureFromLayers(
  layers: Layer[],
  model: ModelState,
  options: TextureOptions = {}
): Promise<Record<string, string>> {
  const textures: Record<string, string> = {}
  const scale = options.scale ?? TEXTURE_PX_PER_MM // texture sampling resolution
  const backgroundColor = options.backgroundColor || "#ffffff"

  // 1. Gather all unique image URLs
  const imageUrls = Array.from(
    new Set(
      layers
        .filter((l) => l.type === "image" && l.imageProperties?.src)
        .map((l) => l.imageProperties!.src)
    )
  )

  // 2. Pre-load all images
  const imageCache: Record<string, HTMLImageElement> = {}
  if (typeof window !== "undefined") {
    await Promise.all(
      imageUrls.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.onload = () => {
              imageCache[src] = img
              resolve()
            }
            img.onerror = () => {
              console.error(`Failed to load image: ${src}`)
              resolve()
            }
            img.src = src
          })
      )
    )
  }

  // 3. Render each face (ONLY if it has visible layers)
  for (const face of model.faces) {
    // Get layers for this face FIRST
    const faceLayers = layers
      .filter((l) => l.faceId === face.id && l.visible)
      .sort((a, b) => {
        const aIndex = layers.indexOf(a)
        const bIndex = layers.indexOf(b)
        return aIndex - bIndex
      })

    // Skip faces without layers in the 3D preview - the model shows its
    // default material there. Exports (includeEmptyFaces) render them.
    if (faceLayers.length === 0 && !options.includeEmptyFaces) {
      continue
    }

    const dim = getFaceDimensions(face.id, model.dimensions)
    const canvas = document.createElement("canvas")
    canvas.width = dim.width * scale
    canvas.height = dim.height * scale
    const ctx = canvas.getContext("2d")

    if (!ctx) continue

    if (options.includeEmptyFaces) {
      // Export: opaque artboard so the file shows the background the user saw
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      // Transparent background so the base material shows through in 3D
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // Render each layer
    for (const layer of faceLayers) {
      ctx.save()
      ctx.globalAlpha = layer.opacity

      // Convert 2D editor coordinates to mm, then to texture pixels.
      // Workspace px are mm × PX_PER_MM; the inverse is the canonical pxToMm(1).
      const editorToMm = pxToMm(1)
      const texturePxPerMm = scale

      const x = layer.position.x * editorToMm * texturePxPerMm
      const y = layer.position.y * editorToMm * texturePxPerMm

      // Apply transform
      ctx.translate(x, y)
      ctx.rotate(layer.rotation)
      ctx.scale(
        layer.scale.x * texturePxPerMm * editorToMm,
        layer.scale.y * texturePxPerMm * editorToMm
      )

      if (layer.type === "text" && layer.textProperties) {
        const props = layer.textProperties
        ctx.font = `${props.fontWeight || 400} ${props.fontSize}px ${props.fontFamily}`
        ctx.fillStyle = props.color
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(props.content, 0, 0)
      } else if (layer.type === "image" && layer.imageProperties) {
        const img = imageCache[layer.imageProperties.src]
        if (img) {
          ctx.drawImage(img, -img.width / 2, -img.height / 2)
        }
      } else if (layer.type === "shape" && layer.shapeProperties) {
        const props = layer.shapeProperties
        ctx.fillStyle = props.fill
        ctx.strokeStyle = props.stroke
        ctx.lineWidth = props.strokeWidth

        if (props.shape === "rect") {
          ctx.beginPath()
          ctx.roundRect(-50, -50, 100, 100, props.cornerRadius || 0)
          ctx.fill()
          if (props.strokeWidth > 0) ctx.stroke()
        } else if (props.shape === "circle") {
          ctx.beginPath()
          ctx.arc(0, 0, 50, 0, Math.PI * 2)
          ctx.fill()
          if (props.strokeWidth > 0) ctx.stroke()
        }
      }

      ctx.restore()
    }

    textures[face.id] = canvas.toDataURL("image/png")
  }

  return textures
}

