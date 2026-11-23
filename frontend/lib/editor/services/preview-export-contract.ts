import type { Face, Layer, ModelDimensions } from "../state/types"
import { facePanel } from "../geometry/units.ts"

export const PREVIEW_DENSITIES = [72, 150, 300, 600] as const
export const PREVIEW_FACE_IDS = ["front","back","left","right","top","bottom","inside_front","inside_back","inside_left","inside_right","inside_top","inside_bottom"]
export const PREVIEW_MARGIN_MM = 10
export const PREVIEW_HEADER_MM = 30
export const isSolidPreviewColor=(v:unknown)=>typeof v==="string" && /^(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([\d.,%\s]+\)|transparent|white|black)$/i.test(v)
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const fail = (message: string): never => { throw new Error(`Preview unavailable: ${message}`) }

export function previewFacePlan(dimensions: ModelDimensions, faces: Face[], density: number) {
  if (!PREVIEW_DENSITIES.includes(density as typeof PREVIEW_DENSITIES[number])) fail("choose 72, 150, 300 or 600 PPI")
  if (!Object.values(dimensions).every(v => finite(v) && v > 0 && v <= 2000)) fail("positive model dimensions up to 2000 mm are required")
  if (![dimensions.length,dimensions.width,dimensions.height].every(finite)) fail("model dimensions are missing")
  if (!faces.length || faces.length > 12 || new Set(faces.map(f => f.id)).size !== faces.length || faces.some(f => !PREVIEW_FACE_IDS.includes(f.id))) fail("the printed face selection is invalid")
  const plan = faces.map(face => {
    const { w, h } = facePanel(dimensions, face.id)
    const pixels = {width: Math.ceil(w*density/25.4), height: Math.ceil(h*density/25.4)}
    if (pixels.width > 8192 || pixels.height > 8192 || pixels.width*pixels.height > 12_000_000) fail("requested face image is too large; choose a lower sampling density")
    return {face, widthMm:w, heightMm:h, pixels, pageWidthMm:Math.max(120,w+2*PREVIEW_MARGIN_MM), pageHeightMm:h+PREVIEW_HEADER_MM+PREVIEW_MARGIN_MM}
  })
  if (plan.reduce((sum,p)=>sum+p.pixels.width*p.pixels.height,0) > 48_000_000) fail("requested preview is too large; choose a lower sampling density or one face")
  return plan
}

// The old texture renderer has a small supported subset. Do not let it silently
// drop groups, unsupported shapes/effects or missing assets in downloaded files.
export function assertPreviewLayers(layers: Layer[]): void {
  if (layers.length > 200) fail("a maximum of 200 visible layers is supported")
  for (const layer of layers) {
    const label = String(layer.name || layer.id || "layer").slice(0,80)
    const reject = (why:string) => fail(`${label}: ${why}`)
    if (![layer.position?.x,layer.position?.y,layer.rotation,layer.scale?.x,layer.scale?.y,layer.opacity].every(finite) || layer.scale.x <= 0 || layer.scale.y <= 0 || layer.opacity < 0 || layer.opacity > 1) reject("invalid transform")
    if (layer.blendMode && !["normal","source-over"].includes(layer.blendMode)) reject("blend effects are not supported")
    if (layer.raisedPrint) reject("raised-print effects are not represented by this RGB preview")
    if (layer.type === "text") {
      const p=layer.textProperties
      if (!p || typeof p.content !== "string" || !p.content.trim() || p.content.length > 1000 || /[\r\n]/.test(p.content)) reject("single-line nonempty text is required")
      if (!finite(p!.fontSize) || p!.fontSize <= 0 || p!.fontSize > 500 || ![100,200,300,400,500,600,700,800,900].includes(p!.fontWeight)) reject("unsupported font size/weight")
      if (!["Arial","sans-serif","serif","monospace"].includes(p!.fontFamily)) reject("font is outside the tested browser-font subset")
      if (!isSolidPreviewColor(p!.color)) reject("unsupported text color")
      if (p!.shadow || p!.stroke || p!.curveRadius || p!.letterSpacing) reject("text effects/spacing are not supported")
    } else if (layer.type === "shape") {
      const p=layer.shapeProperties
      if (!p || !["rect","circle"].includes(p.shape)) reject("only rectangles and circles are supported")
      if (!isSolidPreviewColor(p!.fill) || (p!.stroke && !isSolidPreviewColor(p!.stroke))) reject("unsupported shape color")
      if (!finite(p!.strokeWidth) || p!.strokeWidth < 0 || p!.strokeWidth > 100 || (p!.cornerRadius !== undefined && (!finite(p!.cornerRadius) || p!.cornerRadius < 0 || p!.cornerRadius > 100))) reject("unsupported shape style")
    } else if (layer.type === "image") {
      const p=layer.imageProperties
      if (!p || typeof p.src !== "string" || !p.src || p.src.length > 8_000_000) reject("an available image source is required")
      if (p!.filters && Object.entries(p!.filters).some(([key,value]) => value !== (["brightness","contrast","saturation"].includes(key)?100:0))) reject("image filters are not supported")
    } else reject("unsupported layer type")
  }
}
