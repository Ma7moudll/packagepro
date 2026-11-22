"use client"

import { useRef, useMemo, type ReactNode } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { LINERS, type BoardSpecification } from "@/lib/editor/material-specification"
import { MailerConstruction } from "./MailerConstruction"
import {useProductOpening} from "./useProductOpening"
import { StockPanel } from "./StockPanel"
import { ShippingConstruction } from "./ShippingConstruction"
import { PouchShape } from "./PouchProduct"
import { CupShape, TubeShape } from "./CurvedProducts"
import { FlatProductShape } from "./FlatProducts"
import { PaperBagShape, MailerBagShape, EnvelopeShape } from "./SoftProducts"
import { Html } from "@react-three/drei"
import { productPreviewCoverage } from "@/lib/editor/product-preview-coverage"

// ============================================
// TYPES
// ============================================
export interface BoxDimensions {
  length: number
  width: number
  height: number
}

export interface BoxModelProps {
  carrierHandle?: "none"|"twisted_paper"|"cotton_ropes"|"ribbon"
  boardSpecification?: BoardSpecification
  reliefMasks?: Record<string, string>
  dimensions: BoxDimensions
  type: string
  elements?: any[]
  textures?: Record<string, string>
  texture?: string
  backgroundColor?: string
  material?: string
  printCoverage?: "outside" | "inside" | "both"
  openState?: number
}

// ============================================
// MATERIAL CACHE (Singleton Pattern)
// ============================================
const materialCache = new Map<string, THREE.Material>()

function getCachedMaterial(key: string, factory: () => THREE.Material): THREE.Material {
  if (!materialCache.has(key)) {
    materialCache.set(key, factory())
  }
  return materialCache.get(key)!
}

// ============================================
// PER-FACE TEXTURED MATERIAL RESOLVER
// Maps a faceId to a MeshStandardMaterial carrying the face's generated
// 2D texture (data URL). Faces without a texture resolve to the base
// (cardboard) material passed in as a fallback.
// ============================================
const faceTextureCache = new Map<string, THREE.MeshStandardMaterial>()

// Scales printed-face brightness when the imported-white boost rig is active.
// Without the old flat emissive, inks render saturated under normal light,
// but the boost rig pushes them into AgX's desaturating highlight zone; this
// multiplier pulls them back while plain walls keep the full studio light.
let artworkLightScale = 1
export function setArtworkLightScale(v: number) {
  artworkLightScale = v
}

function resolveFaceMaterial(
  fallback: THREE.MeshStandardMaterial,
  textures: Record<string, string> | undefined,
  faceId: string,
  emissive?: string | null,
  relief?: string,
  exactFace = false
): THREE.MeshStandardMaterial {
  if (!textures) return fallback
  const dataUrl = textures[faceId] ?? (exactFace ? undefined : textures[faceId.replace("inside_", "")])
  if (!dataUrl) return fallback
  // Printed faces get NO flat emissive: white-board looks add ~65-69% white
  // emissive so plain walls read paper-white, but the same additive lift on a
  // printed face washes every ink toward pastel and erases dark text. The
  // composite texture already carries the bright board base, and the light
  // rig (shared or boost) supplies the face's brightness.
  emissive = null

  const cacheKey = `${fallback.uuid}|${artworkLightScale}|${relief || ""}|${dataUrl}`
  let mat = faceTextureCache.get(cacheKey)
  if (!mat) {
    // Print sits ON the board: draw the face's cardboard texture first,
    // then the artwork over it, so kraft striations and board tone show
    // around and through the print like a real printed box.
    const composite = document.createElement("canvas")
    const base = fallback.map?.image as HTMLCanvasElement | undefined
    composite.width = Math.max(1024, base?.width || 0)
    composite.height = Math.max(1024, base?.height || 0)
    const ctx = composite.getContext("2d")!
    if (base) ctx.drawImage(base, 0, 0, composite.width, composite.height)
    const texture = new THREE.CanvasTexture(composite)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 16
    const img = new Image()
    // Relief is lighting-responsive through its normal map only. Do not bake
    // a key-light direction into the artwork, which would contradict orbit.
    const finishArtwork = () => {
      ctx.drawImage(img, 0, 0, composite.width, composite.height)
      texture.needsUpdate = true
      // Ink is a separate optical layer from the liner. Keep the glossy stock
      // reflection around artwork, but do not let a white clearcoat reflection
      // replace the ink colour at the lid's open angle. This is an illustrative
      // preview response, not a specified manufacturing finish.
      if (faceMat instanceof THREE.MeshPhysicalMaterial && faceMat.clearcoat > 0) {
        const opticalMap = (board: number, ink: number) => {
          const c = document.createElement("canvas")
          c.width = composite.width; c.height = composite.height
          const cctx = c.getContext("2d")!
          cctx.drawImage(img, 0, 0, c.width, c.height)
          cctx.globalCompositeOperation = "source-in"
          cctx.fillStyle = `rgb(${ink},${ink},${ink})`
          cctx.fillRect(0, 0, c.width, c.height)
          cctx.globalCompositeOperation = "destination-over"
          cctx.fillStyle = `rgb(${board},${board},${board})`
          cctx.fillRect(0, 0, c.width, c.height)
          const t = new THREE.CanvasTexture(c)
          t.anisotropy = 16
          return t
        }
        faceMat.roughnessMap = opticalMap(Math.round(fallback.roughness * 255), 166)
        faceMat.roughness = 1
        faceMat.clearcoatMap = opticalMap(255, 0)
        faceMat.needsUpdate = true
      }
    }
    img.onload = finishArtwork
    img.src = dataUrl
    mat = fallback.clone()
    const faceMat = mat
    mat.setValues({
      map: texture,
      color: new THREE.Color(artworkLightScale, artworkLightScale, artworkLightScale),
      roughness: fallback.roughness,
      normalMap: fallback.normalMap,
      normalScale: fallback.normalScale.clone(),
      metalness: 0,
      side: THREE.FrontSide,
      emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
    })
    if (relief) {
      // Derive a tangent-space normal map from the greyscale word mask: the
      // blurred mask is treated as a height field and its gradients become
      // surface slopes, so the raised word gets readable edge shading. A raw
      // bump map at printable heights stayed invisible next to the paper
      // fibre normals. Illustrative preview only - no production height or
      // application method is implied.
      const rImg = new Image()
      rImg.onload = () => {
        const w = rImg.width, h = rImg.height
        const src = document.createElement("canvas")
        src.width = w
        src.height = h
        const sctx = src.getContext("2d")!
        sctx.filter = "blur(5px)"
        sctx.drawImage(rImg, 0, 0)
        const data = sctx.getImageData(0, 0, w, h).data
        const out = sctx.createImageData(w, h)
        const heightAt = (x: number, y: number) =>
          data[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255
        const slope = 24 // bevel steepness of the preview relief, not mm
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const gx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * slope
            const gy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * slope
            const inv = 1 / Math.hypot(gx, gy, 1)
            const i = (y * w + x) * 4
            out.data[i] = (-gx * inv * 0.5 + 0.5) * 255
            out.data[i + 1] = (gy * inv * 0.5 + 0.5) * 255
            out.data[i + 2] = (inv * 0.5 + 0.5) * 255
            out.data[i + 3] = 255
          }
        }
        const nCanvas = document.createElement("canvas")
        nCanvas.width = w
        nCanvas.height = h
        nCanvas.getContext("2d")!.putImageData(out, 0, 0)
        const reliefNormal = new THREE.CanvasTexture(nCanvas)
        reliefNormal.anisotropy = 8
        faceMat.normalMap = reliefNormal
        faceMat.normalScale = new THREE.Vector2(1, 1)
        faceMat.needsUpdate = true

      }
      rImg.onerror = () => { /* Keep printed artwork if a preview mask fails. */ }
      rImg.src = relief
    }
    faceTextureCache.set(cacheKey, mat)
  }
  return mat
}

// ============================================
// TEXTURE GENERATORS
// ============================================

// Create noise texture for roughness variation
function createNoiseTexture(size = 256, intensity = 0.2): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  // Base gray
  const baseValue = 200
  const imageData = ctx.createImageData(size, size)

  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity * 255
    const value = Math.min(255, Math.max(0, baseValue + noise))
    imageData.data[i] = value
    imageData.data[i + 1] = value
    imageData.data[i + 2] = value
    imageData.data[i + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  return texture
}

// Create fiber normal map for cardboard texture
function createFiberNormalMap(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  // Neutral normal (pointing up)
  ctx.fillStyle = "rgb(128, 128, 255)"
  ctx.fillRect(0, 0, size, size)

  // Add horizontal fiber lines
  for (let y = 0; y < size; y += 3) {
    const variance = Math.random() * 20 - 10
    ctx.strokeStyle = `rgb(${128 + variance}, ${128}, 255)`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y + (Math.random() - 0.5) * 2)
    ctx.stroke()
  }

  // Add subtle vertical fibers
  for (let x = 0; x < size; x += 8) {
    const variance = Math.random() * 15 - 7
    ctx.strokeStyle = `rgb(128, ${128 + variance}, 255)`
    ctx.lineWidth = 0.5
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + (Math.random() - 0.5) * 3, size)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

// Create corrugated edge texture (zigzag pattern)
function createCorrugatedEdgeTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  // Corrugated cross-section: kraft liners top and bottom, the wavy medium
  // between them rendered as alternating lit crests and dark shadow valleys,
  // the way a real cut board edge photographs.
  const flutes = 8
  const period = size / flutes
  const linerH = size * 0.22

  // Flute medium base
  ctx.fillStyle = "#A8885C"
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < flutes; i++) {
    const x0 = i * period
    const grad = ctx.createLinearGradient(x0, 0, x0 + period, 0)
    grad.addColorStop(0, "rgba(58, 40, 20, 0.9)")
    grad.addColorStop(0.35, "rgba(198, 166, 118, 0.95)")
    grad.addColorStop(0.7, "rgba(142, 112, 74, 0.9)")
    grad.addColorStop(1, "rgba(58, 40, 20, 0.9)")
    ctx.fillStyle = grad
    ctx.fillRect(x0, linerH, period, size - linerH * 2)
  }
  // Fine vertical flute ridges
  for (let i = 0; i < flutes * 2; i++) {
    const x = (i / (flutes * 2)) * size
    ctx.fillStyle = "rgba(48, 34, 16, 0.4)"
    ctx.fillRect(x, linerH, 1, size - linerH * 2)
  }

  // Liners sandwiching the flute
  const liner = ctx.createLinearGradient(0, 0, 0, linerH)
  liner.addColorStop(0, "#D9BE94")
  liner.addColorStop(1, "#C2A174")
  ctx.fillStyle = liner
  ctx.fillRect(0, 0, size, linerH)
  const liner2 = ctx.createLinearGradient(0, size - linerH, 0, size)
  liner2.addColorStop(0, "#C2A174")
  liner2.addColorStop(1, "#D9BE94")
  ctx.fillStyle = liner2
  ctx.fillRect(0, size - linerH, size, linerH)

  // Dark separation lines where liner meets flute
  ctx.fillStyle = "rgba(50, 36, 18, 0.85)"
  ctx.fillRect(0, linerH - 1, size, 1.5)
  ctx.fillRect(0, size - linerH - 0.5, size, 1.5)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(6, 1)
  texture.anisotropy = 16
  return texture
}

// ============================================
// CARDBOARD TEXTURE - لون كرتون طبيعي (ليس خشب)
// ============================================
function createPhotoRealisticCardboard(size = 1024, isInside = false, tone: 'kraft' | 'white' | 'white-imported' = 'kraft', outOverride?: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  // Baked board tones matched to real reference renders (Packhelp):
  // kraft = warm tan testliner, white = duller greyish Egyptian white,
  // white-imported = bright smooth coated liner.
  const tones = {
    kraft:            { out: "#A8855A", inn: "#D9C7A8", line: [96, 70, 42],    lineOut: 0.22, lineIn: 0.13, bandA: 0.12, fiber: [130, 100, 66] },
    white:            { out: "#BABFC4", inn: "#CBCDD2", line: [100, 105, 112], lineOut: 0.22, lineIn: 0.12, bandA: 0.14, fiber: [134, 140, 148] },
    "white-imported": { out: "#DDE1E6", inn: "#E9ECEF", line: [170, 175, 182], lineOut: 0.09, lineIn: 0.06, bandA: 0.05, fiber: [190, 194, 200] },
  } as const
  const t = tones[tone] ?? tones.kraft
  const [lr, lg, lb] = t.line

  ctx.fillStyle = isInside ? t.inn : (outOverride ?? t.out)
  ctx.fillRect(0, 0, size, size)

  // Fine horizontal flute striations with a slight organic wobble
  const lineA = isInside ? t.lineIn : t.lineOut
  for (let y = 0; y < size; y += 3) {
    const alpha = lineA * (0.5 + Math.random() * 0.8)
    ctx.strokeStyle = `rgba(${lr}, ${lg}, ${lb}, ${alpha.toFixed(3)})`
    ctx.lineWidth = 0.8
    const phase = Math.random() * Math.PI * 2
    ctx.beginPath()
    for (let x = 0; x <= size; x += 32) {
      const yy = y + Math.sin((x / size) * Math.PI * 4 + phase) * 0.6
      if (x === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }

  // Flute print-through: soft darker bands where the wavy medium telegraphs
  // through the liner. Very visible on kraft and Egyptian white board.
  if (tone !== "white-imported") {
    for (let y = 23; y < size; y += 46) {
      const g = ctx.createLinearGradient(0, y - 3, 0, y + 3)
      g.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, 0)`)
      g.addColorStop(0.5, `rgba(${lr}, ${lg}, ${lb}, ${t.bandA})`)
      g.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`)
      ctx.fillStyle = g
      ctx.fillRect(0, y - 3, size, 6)
    }
  }

  // Sparse vertical fibre ticks on kraft
  if (tone === "kraft") {
    const [fr, fg, fb] = t.fiber
    for (let i = 0; i < size * 1.5; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const len = 2 + Math.random() * 6
      ctx.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${(0.10 + Math.random() * 0.18).toFixed(3)})`
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (Math.random() - 0.5), y + len)
      ctx.stroke()
    }
  }

  // Fine grain
  const imgData = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8
    imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise))
    imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise * 0.9))
    imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise * 0.8))
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.2, 1.2)
  texture.anisotropy = 16
  return texture
}

// ============================================
// CARDBOARD NORMAL MAP (Depth)
// ============================================
function createCardboardNormal(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "rgb(128, 128, 255)"
  ctx.fillRect(0, 0, size, size)

  // تموجات أفقية بارزة
  for (let y = 0; y < size; y += 2.2) {
    const bump = 18 + Math.sin(y * 0.08) * 10
    ctx.strokeStyle = `rgb(${128 + bump}, 128, ${255 - bump * 0.6})`
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
  }

  // تموجات عمودية خفيفة
  for (let x = 0; x < size; x += 12) {
    ctx.strokeStyle = `rgb(128, ${128 + Math.random() * 8}, 252)`
    ctx.lineWidth = 0.6
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.5, 2.5)
  return texture
}

// ============================================
// ROUGHNESS MAP (Variation)
// ============================================
function createRoughnessMap(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  const imgData = ctx.createImageData(size, size)
  for (let i = 0; i < imgData.data.length; i += 4) {
    const base = 210
    const variation = (Math.random() - 0.5) * 50
    const value = Math.max(160, Math.min(255, base + variation))
    imgData.data[i] = value
    imgData.data[i + 1] = value
    imgData.data[i + 2] = value
    imgData.data[i + 3] = 255
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)
  return texture
}

// ============================================
// AMBIENT OCCLUSION MAP (Corner shadows)
// ============================================
function createAOMap(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, size, size)

  // ظلال في الأركان
  const corners = [[0, 0], [size, 0], [0, size], [size, size]]
  corners.forEach(([x, y]) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.4)
    grad.addColorStop(0, "rgba(0, 0, 0, 0.3)")
    grad.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

// ============================================
// CORRUGATED EDGE DETAIL COMPONENT (Realistic)
// ============================================
interface CorrugatedEdgeProps {
  position: [number, number, number]
  height: number
  rotation?: [number, number, number]
}

function CorrugatedEdgeDetail({ position, height, rotation = [0, 0, 0] }: CorrugatedEdgeProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Outer shell */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.011, 0.011, height, 24]} />
        <meshStandardMaterial color="#8B6F47" roughness={0.95} metalness={0} />
      </mesh>

      {/* Inner corrugation details (8 flutes) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 0.007,
              0,
              Math.sin(angle) * 0.007
            ]}
          >
            <cylinderGeometry args={[0.003, 0.003, height * 0.94, 8]} />
            <meshStandardMaterial color="#6B5338" roughness={1} />
          </mesh>
        )
      })}
    </group>
  )
}

// ============================================
// REALISTIC CARDBOARD MATERIAL
// ============================================
function createCardboardMaterial(
  baseColor: string,
  isInside = false,
  cacheKey?: string
): THREE.MeshStandardMaterial {
  const key = cacheKey || `cardboard-${baseColor}-${isInside}`

  return getCachedMaterial(key, () => {
    const roughnessMap = createNoiseTexture(256, 0.15)
    const normalMap = createFiberNormalMap(256)

    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: isInside ? 0.95 : 0.82,
      metalness: 0,
      roughnessMap,
      normalMap,
      normalScale: new THREE.Vector2(0.25, 0.25),
    })
  }) as THREE.MeshStandardMaterial
}

// ============================================
// EASING FUNCTIONS
// ============================================
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}


// ============================================
// FLAP COMPONENT (Correct Pivot)
// ============================================
interface FlapProps {
  width: number
  depth: number
  thickness: number
  angle: number
  position: [number, number, number]
  material: THREE.Material
  rotationAxis?: "x" | "-x" | "z" | "-z"
}

function Flap({ width, depth, thickness, angle, position, material, rotationAxis = "x" }: FlapProps) {
  // Pivot is at the edge, not center
  const rotation: [number, number, number] = [0, 0, 0]
  const meshOffset: [number, number, number] = [0, 0, 0]

  switch (rotationAxis) {
    case "x":
      rotation[0] = angle
      meshOffset[2] = -depth / 2
      break
    case "-x":
      rotation[0] = -angle
      meshOffset[2] = depth / 2
      break
    case "z":
      rotation[2] = angle
      meshOffset[0] = -depth / 2
      break
    case "-z":
      rotation[2] = -angle
      meshOffset[0] = depth / 2
      break
  }

  return (
    <group position={position}>
      <group rotation={rotation}>
        <mesh position={meshOffset} castShadow>
          <boxGeometry args={[width, thickness, depth]} />
          <primitive object={material} attach="material" />
        </mesh>
      </group>
    </group>
  )
}


// ============================================
// BOARD LOOK PER MATERIAL (Egyptian market)
// ============================================
interface BoardLook {
  outsideColor: string
  insideColor: string
  textureTone: 'kraft' | 'white' | 'white-imported'
  roughness: number
  corrugated: boolean
  fluteTint: string
  wallBright: string | null
  // Flat light added to white boards: the rig leaves wall faces at ~60% of
  // texture brightness, which reads grey, not white. Kraft stays untouched.
  // THREE.Color(hex) converts sRGB to linear, so hex values near white are
  // needed for a visible lift; walls need much more than the lid.
  emissive: string | null
  wallEmissive: string | null
}

/**
 * Enables THREE layer 1 on every mesh in the box so the white-board boost
 * rig (DesignCanvas3D) can light the box harder for imported white without
 * touching other materials. Meshes keep layer 0, so camera, picking,
 * shadows and ContactShadows are unaffected. Re-runs periodically because
 * open-state rims mount/unmount during the lid animation.
 */
function LayerOneGroup({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const frame = useRef(0)
  useFrame(() => {
    if (frame.current++ % 30 !== 0) return
    ref.current?.traverse((o) => o.layers.enable(1))
  })
  return <group ref={ref}>{children}</group>
}

function boardLook(materialType?: string): BoardLook {
  const m = (materialType || 'kraft').toLowerCase()
  const corrugated = m.includes('corrugated')
  // Board tone is baked into the texture itself; the material colour stays
  // white so the texture shows exactly the tone it was painted with.
  // أبيض مصري — duller, slightly grey, recycled fibre
  if (m.includes('local') || m.startsWith('corrugated-white')) {
    return {
      outsideColor: '#FFFFFF',
      insideColor: '#FFFFFF',
      // Walls sit in the renderer's saturated mid-tone zone and render warm
      // while the brighter lid desaturates to neutral. A brighter wall-only
      // texture pushes the walls into the same neutral zone (measured:
      // cool color multiplies only darkened and skewed blue).
      wallBright: '#E4E4E6',
      emissive: '#7A7A7C',
      wallEmissive: '#A6A6A8',
      textureTone: 'white',
      roughness: 0.9,
      corrugated,
      fluteTint: '#FFFFFF',
    }
  }
  // أبيض مستورد — bright, smooth coated liner
  if (m.includes('white') || m.includes('coated') || m.includes('premium') || m.startsWith('paper-')) {
    return {
      outsideColor: '#FFFFFF',
      insideColor: '#FFFFFF',
      wallBright: '#EFEFF1',
      emissive: '#8A8A8C',
      wallEmissive: '#B0B0B2',
      textureTone: 'white-imported',
      roughness: 0.5,
      corrugated,
      fluteTint: '#FFFFFF',
    }
  }
  // بني كرافت — brown testliner
  return {
    outsideColor: '#FFFFFF',
    insideColor: '#FFFFFF',
    wallBright: null as string | null,
    emissive: null as string | null,
    wallEmissive: null as string | null,
    textureTone: 'kraft',
    roughness: 0.92,
    corrugated: true,
    fluteTint: '#FFFFFF',
  }
}

// Cut-edge corrugation strip: flute texture visible on raw board edges.
interface CorrugatedRimProps {
  position: [number, number, number]
  length: number
  thickness: number
  axis?: 'x' | 'z'
  tint?: string
}

function CorrugatedRim({ position, length, thickness, axis = 'x', tint = '#FFFFFF' }: CorrugatedRimProps) {
  const tex = useMemo(() => createCorrugatedEdgeTexture(128), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    map: tex,
    color: tint,
    roughness: 0.95,
    metalness: 0,
  }), [tex, tint])
  const args: [number, number, number] = axis === 'x'
    ? [length, thickness, thickness]
    : [thickness, thickness, length]
  return (
    <mesh position={position} material={mat}>
      <boxGeometry args={args} />
    </mesh>
  )
}

// ============================================
// MAILER BOX - فارغ من الداخل + إغلاق سلس
// ============================================
export function MailerBox({
  dimensions,
  boardSpecification,
  reliefMasks,
  textures,
  backgroundColor,
  material: materialType,
  printCoverage = "outside",
  openState = 0
}: BoxModelProps) {
  const l = dimensions.length / 100
  const w = dimensions.width / 100
  const h = dimensions.height / 100

  const exterior = LINERS.find(l => l.id === boardSpecification?.outside)
  const interior = LINERS.find(l => l.id === boardSpecification?.inside)
  const look = useMemo(() => {
    const legacy = boardLook(materialType)
    if (!exterior) return legacy
    return { ...boardLook(exterior.id.includes("white") ? "cardboard-white-imported" : "kraft"), outsideColor: "#FFFFFF", insideColor: "#FFFFFF", emissive: exterior.id.includes("white") ? "#777779" : null, wallEmissive: exterior.id.includes("white") ? "#99999B" : null, roughness: exterior.roughness, wallBright: null }
  }, [materialType, exterior])
  const insideLook = useMemo(() => interior ? boardLook(interior.id.includes("white") ? "cardboard-white-imported" : "kraft") : look, [interior, look])

  const outsideMap = useMemo(() => createPhotoRealisticCardboard(512, false, look.textureTone, exterior?.colour), [look.textureTone, exterior])
  const insideMap = useMemo(() => createPhotoRealisticCardboard(512, !interior, insideLook.textureTone, interior?.colour), [insideLook.textureTone, interior])

  const paperNormal = useMemo(() => createFiberNormalMap(256), [])
  const paperRoughness = useMemo(() => createNoiseTexture(256, 0.08), [])
  const paperDepth = look.textureTone === "white-imported" ? 0.045 : 0.12

  const outsideMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    map: outsideMap,
    color: look.outsideColor,
    roughness: exterior?.id === "white-imported-gloss" ? 0.12 : look.roughness,
    clearcoat: exterior?.id === "white-imported-gloss" ? 1 : 0,
    clearcoatRoughness: 0.08,
    metalness: 0,
    normalMap: paperNormal,
    normalScale: new THREE.Vector2(paperDepth, paperDepth),
    roughnessMap: paperRoughness,
    emissive: look.emissive ? new THREE.Color(look.emissive) : new THREE.Color(0x000000),
  }), [outsideMap, look, paperNormal, paperDepth, paperRoughness, boardSpecification])

  // Wall-only material with a brighter board texture, so wall faces reach
  // the same desaturated neutral response as the lid (kraft unchanged).
  const wallMap = useMemo(
    () => look.wallBright ? createPhotoRealisticCardboard(512, false, look.textureTone, look.wallBright) : outsideMap,
    [look.wallBright, look.textureTone, outsideMap]
  )
  const wallMaterial = useMemo(() => {
    const wm = outsideMaterial.clone()
    wm.map = wallMap
    if (look.wallEmissive) wm.emissive = new THREE.Color(look.wallEmissive)
    return wm
  }, [outsideMaterial, wallMap, look.wallEmissive])

  const insideMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    map: insideMap,
    color: look.insideColor,
    roughness: interior?.id === "white-imported-gloss" ? 0.12 : interior?.roughness ?? Math.min(0.95, look.roughness + 0.04),
    clearcoat: interior?.id === "white-imported-gloss" ? 1 : 0,
    clearcoatRoughness: 0.08,
    emissive: interior?.id.includes("white") ? new THREE.Color("#777779") : new THREE.Color(0),
    metalness: 0,
    normalMap: paperNormal,
    normalScale: new THREE.Vector2(paperDepth, paperDepth),
    roughnessMap: paperRoughness,
  }), [insideMap, look, paperNormal, paperDepth, paperRoughness, interior])

  const t = easeInOutCubic(openState)

  // Per-face art binding — deterministic 2D→3D mapping.
  const frontMat = resolveFaceMaterial(wallMaterial, textures, "front", look.wallEmissive, reliefMasks?.front)
  const backMat = resolveFaceMaterial(wallMaterial, textures, "back", look.wallEmissive, reliefMasks?.back)
  const leftMat = resolveFaceMaterial(wallMaterial, textures, "left", look.wallEmissive, reliefMasks?.left)
  const rightMat = resolveFaceMaterial(wallMaterial, textures, "right", look.wallEmissive, reliefMasks?.right)
  const topMat = resolveFaceMaterial(outsideMaterial, textures, "top", look.emissive, reliefMasks?.top)
  const bottomMat = resolveFaceMaterial(boardSpecification ? outsideMaterial : insideMaterial, textures, "bottom", null, reliefMasks?.bottom)

  return <LayerOneGroup>
    <MailerConstruction l={l} w={w} h={h} open={t}
      outside={outsideMaterial} inside={insideMaterial}
      insideFaces={Object.fromEntries(["front","back","left","right","top","bottom"].map(face => [face, resolveFaceMaterial(insideMaterial, textures, `inside_${face}`, null, reliefMasks?.[`inside_${face}`], true)]))}
      front={frontMat} back={backMat} left={leftMat} right={rightMat}
      top={topMat} bottom={bottomMat} tone={look.textureTone} />
  </LayerOneGroup>
}

/** Fine paper grain for non-mailer stock, without painted corrugation bands.
 * Corrugation belongs to a cut edge, not wood-like stripes across every liner. */
function createProductPaper(colour:string,subtle=false){
 const c=document.createElement("canvas");c.width=512;c.height=512
 const ctx=c.getContext("2d")!;ctx.fillStyle=colour;ctx.fillRect(0,0,512,512)
 for(let i=0;i<18000;i++){
  const x=Math.random()*512,y=Math.random()*512
  ctx.fillStyle=subtle?(i%2?"rgba(255,255,255,.012)":"rgba(55,43,28,.008)"):(i%2?"rgba(255,255,255,.045)":"rgba(55,43,28,.025)")
  ctx.fillRect(x,y,.6+Math.random(),.6+Math.random())
 }
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=16
 return map
}

/** Shared optical stock and artwork binding. Product geometry remains separate.
 * Requested liner/finish is illustrative and does not certify process suitability. */
function createNeutralFilm(colour="#eeeeec"){
 const c=document.createElement("canvas");c.width=64;c.height=64
 const ctx=c.getContext("2d")!;ctx.fillStyle=colour;ctx.fillRect(0,0,64,64)
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t
}
function useProductStock({boardSpecification:requestedBoard, material:requestedMaterial, textures, reliefMasks, type}: BoxModelProps) {
  // A paperboard liner request must not turn a film/foil product into cardboard.
  const coverage=productPreviewCoverage(type),paper=coverage.paperSurface,subtlePaper=coverage.family==="shipping"||coverage.family==="bag"
  const boardSpecification=coverage.twoSidedStock?requestedBoard:undefined
  // Non-paper families use a neutral illustrative film surface until their own
  // material selector is prepared. A saved kraft box material is not film.
  const material=requestedMaterial
  const filmColour=material?.includes("black")?"#242424":"#eeeeec"
  const polyFilm=material?.startsWith("poly-")||material==="bio-poly"
  const legacy = useMemo(() => boardLook(material), [material])
  const exterior = LINERS.find(l => l.id === boardSpecification?.outside)
  const interior = LINERS.find(l => l.id === boardSpecification?.inside)
  const outsideMap = useMemo(() => paper?createProductPaper(exterior?.colour ?? (material?.includes("kraft")?"#a8855a":"#e9ecef"),subtlePaper):createNeutralFilm(filmColour), [legacy.textureTone, exterior, material,paper,filmColour,subtlePaper])
  const insideMap = useMemo(() => paper?createProductPaper(interior?.colour ?? (material?.includes("kraft")?"#d9c7a8":"#e9ecef"),subtlePaper):createNeutralFilm(filmColour), [legacy.textureTone, interior, material,paper,filmColour,subtlePaper])
  const outside = useMemo(() => new THREE.MeshPhysicalMaterial({map:outsideMap,color:!paper||exterior?"#ffffff":legacy.outsideColor,roughness:!paper?(material?.includes("matte")?.8:polyFilm?.58:.45):exterior?.id==="white-imported-gloss"?.12:exterior?.roughness??(material?.includes("gloss")?.12:material?.includes("matte")?.85:legacy.roughness),clearcoat:!paper?(polyFilm?.035:.12):exterior?.id==="white-imported-gloss"||(!exterior&&material?.includes("gloss"))?1:0,clearcoatRoughness:.08,metalness:0}), [outsideMap,exterior,legacy,paper,polyFilm])
  const inside = useMemo(() => new THREE.MeshPhysicalMaterial({map:insideMap,color:!paper||interior?"#ffffff":legacy.insideColor,roughness:interior?.id==="white-imported-gloss"?.12:interior?.roughness??.92,clearcoat:interior?.id==="white-imported-gloss"?1:0,clearcoatRoughness:.08,metalness:0}), [insideMap,interior,legacy,paper])
  const edge = useMemo(() => new THREE.MeshStandardMaterial({color:!paper?"#d8d8d8":exterior?.id.includes("white")?"#cbbfa9":"#aa8c63",roughness:1}), [exterior,paper])
  return {outside,inside,edge,face:(id:string)=>resolveFaceMaterial(outside,textures,id,null,reliefMasks?.[id],true),inner:(id:string)=>resolveFaceMaterial(inside,textures,`inside_${id}`,null,reliefMasks?.[`inside_${id}`],true)}
}

// ============================================
// SHIPPING BOX (RSC) - فارغ من الداخل + إغلاق سلس
// ============================================
export function ShippingBox(props: BoxModelProps) {
 const stock=useProductStock(props)
 return <ShippingConstruction dimensions={props.dimensions} stock={stock} openState={props.openState}/>
}

// Two-piece rigid construction, with an open hollow lid rather than a solid block.
export function RigidBox(props:BoxModelProps){
 const motion=useProductOpening(props.openState??0)
 const {dimensions}=props,{length:L,width:W,height:H}=dimensions
 const l=L/100,w=W/100,h=H/100,b=.008,bh=h*.7,lh=h*.3,over=b*3,t=easeInOutCubic(motion),stock=useProductStock(props)
 const p={thickness:b,edge:stock.edge}
 const walls=(length:number,width:number,height:number,lid=false)=><>
  <StockPanel {...p} width={length} height={height} outside={stock.face("front")} inside={stock.inner("front")} faceId="front" uvRect={lid?[0,.7,1,1]:[0,0,1,.7]} position={[0,height/2,width/2]}/>
  <StockPanel {...p} width={length} height={height} outside={stock.face("back")} inside={stock.inner("back")} faceId="back" uvRect={lid?[0,.7,1,1]:[0,0,1,.7]} position={[0,height/2,-width/2]} rotation={[0,Math.PI,0]}/>
  <StockPanel {...p} width={width} height={height} outside={stock.face("left")} inside={stock.inner("left")} faceId="left" uvRect={lid?[0,.7,1,1]:[0,0,1,.7]} position={[-length/2,height/2,0]} rotation={[0,-Math.PI/2,0]}/>
  <StockPanel {...p} width={width} height={height} outside={stock.face("right")} inside={stock.inner("right")} faceId="right" uvRect={lid?[0,.7,1,1]:[0,0,1,.7]} position={[length/2,height/2,0]} rotation={[0,Math.PI/2,0]}/>
 </>
 return <group name="rigid-construction">
  {walls(l,w,bh)}
  <StockPanel {...p} width={l} height={w} outside={stock.face("bottom")} inside={stock.inner("bottom")} faceId="bottom" position={[0,b/2,0]} rotation={[Math.PI/2,0,0]}/>
  <group position={[0,bh+t*h*.85,0]}>
   {walls(l+over,w+over,lh,true)}
   <StockPanel {...p} width={l+over} height={w+over} outside={stock.face("top")} inside={stock.inner("top")} faceId="top" position={[0,lh,0]} rotation={[-Math.PI/2,0,0]}/>
  </group>
 </group>
}
export function GiftBox(props:BoxModelProps){return <RigidBox {...props}/>}

export function FoldingCarton(props:BoxModelProps){
 const motion=useProductOpening(props.openState??0)
 const {dimensions}=props,{length:L,width:W,height:H}=dimensions,l=L/100,w=W/100,h=H/100,b=.004
 const t=easeInOutCubic(motion),stock=useProductStock(props),lid=w-b*2,tuck=Math.min(h*.3,w*.45),dust=Math.min(w*.4,h*.28)
 const p={thickness:b,edge:stock.edge}
 return <group name="folding-carton-construction">
  <StockPanel {...p} width={l} height={h} outside={stock.face("front")} inside={stock.inner("front")} faceId="front" position={[0,h/2,w/2]}/>
  <StockPanel {...p} width={l} height={h} outside={stock.face("back")} inside={stock.inner("back")} faceId="back" position={[0,h/2,-w/2]} rotation={[0,Math.PI,0]}/>
  <StockPanel {...p} width={w} height={h} outside={stock.face("left")} inside={stock.inner("left")} faceId="left" position={[-l/2,h/2,0]} rotation={[0,-Math.PI/2,0]}/>
  <StockPanel {...p} width={w} height={h} outside={stock.face("right")} inside={stock.inner("right")} faceId="right" position={[l/2,h/2,0]} rotation={[0,Math.PI/2,0]}/>
  <StockPanel {...p} width={l-b} height={w-b} outside={stock.face("bottom")} inside={stock.inner("bottom")} faceId="bottom" position={[0,b/2,0]} rotation={[Math.PI/2,0,0]}/>
  {[-1,1].map(side=><group key={side} position={[side*l/2,h-b*2,0]} rotation={[0,0,-side*t*Math.PI*.6]}>
   <StockPanel {...p} width={dust} height={w-b*2} outside={stock.outside} inside={stock.inside} position={[-side*dust/2,0,0]} rotation={[-Math.PI/2,0,0]}/>
  </group>)}
  <group position={[0,h,-w/2+b]} rotation={[-t*Math.PI*.59,0,0]}>
   <StockPanel {...p} width={l} height={lid} outside={stock.face("top")} inside={stock.inner("top")} faceId="top" position={[0,0,lid/2]} rotation={[-Math.PI/2,0,0]}/>
   <group position={[0,0,lid]} rotation={[(Math.PI/2)*(1-t*.83),0,0]}>
    <StockPanel {...p} width={l*.82} height={tuck} outside={stock.outside} inside={stock.inside} position={[0,0,tuck/2]} rotation={[-Math.PI/2,0,0]}/>
   </group>
  </group>
 </group>
}

export function PizzaBox(props:BoxModelProps){
 const motion=useProductOpening(props.openState??0)
 const {dimensions}=props,{length:L,width:W,height:H}=dimensions,l=L/100,w=W/100,h=H/100,b=.008,bh=h*.72,lh=h*.28,over=b*2.5
 const t=easeInOutCubic(motion),stock=useProductStock(props),p={thickness:b,edge:stock.edge}
 return <group name="pizza-construction">
  <StockPanel {...p} width={l} height={bh} outside={stock.face("front")} inside={stock.inner("front")} faceId="front" position={[0,bh/2,w/2]}/>
  <StockPanel {...p} width={l} height={bh} outside={stock.face("back")} inside={stock.inner("back")} faceId="back" position={[0,bh/2,-w/2]} rotation={[0,Math.PI,0]}/>
  <StockPanel {...p} width={w} height={bh} outside={stock.face("left")} inside={stock.inner("left")} faceId="left" position={[-l/2,bh/2,0]} rotation={[0,-Math.PI/2,0]}/>
  <StockPanel {...p} width={w} height={bh} outside={stock.face("right")} inside={stock.inner("right")} faceId="right" position={[l/2,bh/2,0]} rotation={[0,Math.PI/2,0]}/>
  <StockPanel {...p} width={l} height={w} outside={stock.face("bottom")} inside={stock.inner("bottom")} faceId="bottom" position={[0,b/2,0]} rotation={[Math.PI/2,0,0]}/>
  <group position={[0,bh,-w/2]} rotation={[-t*Math.PI*.55,0,0]}>
   <StockPanel {...p} width={l+over} height={lh} outside={stock.outside} inside={stock.inside} position={[0,lh/2,0]} rotation={[0,Math.PI,0]}/>
   <StockPanel {...p} width={l+over} height={w+over} outside={stock.face("top")} inside={stock.inner("top")} faceId="top" position={[0,lh,(w+over)/2]} rotation={[-Math.PI/2,0,0]}/>
   <StockPanel {...p} width={l+over} height={lh} outside={stock.outside} inside={stock.inside} position={[0,lh/2,w+over]}/>
   {[-1,1].map(side=><StockPanel key={side} {...p} width={w+over} height={lh} outside={stock.outside} inside={stock.inside} position={[side*(l+over)/2,lh/2,(w+over)/2]} rotation={[0,side*Math.PI/2,0]}/>)}
  </group>
 </group>
}

// Product-shaped previews use shared optics, never shared box geometry.
export function PaperCup(props:BoxModelProps){const stock=useProductStock(props);return <CupShape {...props} stock={stock}/>}
export function CarrierBag(props:BoxModelProps){const stock=useProductStock(props);return <PaperBagShape {...props} stock={stock}/>}
export function Tube(props:BoxModelProps){const stock=useProductStock(props);return <TubeShape {...props} stock={stock}/>}
export function Envelope(props:BoxModelProps){const stock=useProductStock(props);return <EnvelopeShape {...props} stock={stock}/>}
export function Label(props:BoxModelProps){const stock=useProductStock(props);return <FlatProductShape {...props} stock={stock}/>}
export function MailerBag(props:BoxModelProps){const stock=useProductStock(props);return <MailerBagShape {...props} stock={stock}/>}
// Pouch-specific sealed/gusset construction is not prepared yet.
export function StandUpPouch(props:BoxModelProps){const stock=useProductStock(props);return <PouchShape {...props} stock={stock}/>}

// ============================================
// MODEL FACTORY
// ============================================
function UnsupportedProductPreview(){
 return <Html center><div style={{width:280,padding:20,background:"white",border:"1px solid #ddd",borderRadius:12,textAlign:"center",color:"#334155"}}><strong>3D preview not prepared</strong><p>This product keeps its design and specifications. No substitute box is shown.</p></div></Html>
}
export function getBoxModel(type: string) {
 const family=productPreviewCoverage(type).family
 switch(family){
  case "mailer":return MailerBox
  case "shipping":return ShippingBox
  case "rigid":return RigidBox
  case "carton":return FoldingCarton
  case "pizza":return PizzaBox
  case "cup":return PaperCup
  case "bag":return CarrierBag

  case "pouch":return StandUpPouch
  case "tube":return Tube
  case "envelope":return Envelope
  case "label":return Label
  case "flat":return Label
  case "mailer-bag":return MailerBag
  default:return UnsupportedProductPreview
 }
}

// Export for external use
export { createCardboardMaterial, createNoiseTexture, createFiberNormalMap }
