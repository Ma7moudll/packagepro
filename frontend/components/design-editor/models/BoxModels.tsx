"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// ============================================
// TYPES
// ============================================
export interface BoxDimensions {
  length: number
  width: number
  height: number
}

export interface BoxModelProps {
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

function resolveFaceMaterial(
  fallback: THREE.MeshStandardMaterial,
  textures: Record<string, string> | undefined,
  faceId: string
): THREE.MeshStandardMaterial {
  if (!textures) return fallback
  const dataUrl = textures[faceId] ?? textures[faceId.replace("inside_", "")]
  if (!dataUrl) return fallback

  let mat = faceTextureCache.get(dataUrl)
  if (!mat) {
    const img = new Image()
    img.src = dataUrl
    const texture = new THREE.Texture(img)
    img.onload = () => {
      texture.needsUpdate = true
    }
    texture.colorSpace = THREE.SRGBColorSpace
    mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.8,
      metalness: 0,
      side: THREE.FrontSide,
    })
    faceTextureCache.set(dataUrl, mat)
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
function createCorrugatedEdgeTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  ctx.fillStyle = "#D4C4A8"
  ctx.fillRect(0, 0, size, size)

  // Zigzag pattern
  ctx.strokeStyle = "#8B7355"
  ctx.lineWidth = 1

  const waveHeight = 6
  const waveWidth = 8

  for (let y = 0; y < size; y += waveHeight * 2) {
    ctx.beginPath()
    for (let x = 0; x < size; x += waveWidth) {
      const yOffset = (Math.floor(x / waveWidth) % 2) * waveHeight
      if (x === 0) {
        ctx.moveTo(x, y + yOffset)
      } else {
        ctx.lineTo(x, y + yOffset)
      }
    }
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)
  return texture
}

// ============================================
// CARDBOARD TEXTURE - لون كرتون طبيعي (ليس خشب)
// ============================================
function createPhotoRealisticCardboard(size = 1024, isInside = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")!

  if (isInside) {
    // داخل الصندوق - بيج فاتح جداً
    ctx.fillStyle = "#F0E6D3"
    ctx.fillRect(0, 0, size, size)

    // خطوط تموج خفيفة جداً
    for (let y = 0; y < size; y += 3.5) {
      ctx.strokeStyle = `rgba(200, 180, 150, ${0.15 + Math.random() * 0.1})`
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
    }
  } else {
    // خارج الصندوق - كرتون بني فاتح (مش خشب)
    ctx.fillStyle = "#D4B896"
    ctx.fillRect(0, 0, size, size)

    // خطوط التموج الأفقية - خفيفة وواضحة
    for (let y = 0; y < size; y += 3) {
      const alpha = 0.2 + Math.random() * 0.15
      ctx.strokeStyle = `rgba(160, 130, 100, ${alpha})`
      ctx.lineWidth = 0.8

      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
    }

    // خطوط أغمق كل فترة
    ctx.strokeStyle = "rgba(140, 110, 80, 0.18)"
    ctx.lineWidth = 1.2
    for (let y = 0; y < size; y += 9) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
    }
  }

  // نسيج خفيف
  const imgData = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < imgData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 10
    imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise))
    imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise * 0.9))
    imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise * 0.8))
  }
  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
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
// MAILER BOX - فارغ من الداخل + إغلاق سلس
// ============================================
export function MailerBox({
  dimensions,
  textures,
  backgroundColor,
  material: materialType,
  printCoverage = "outside",
  openState = 0
}: BoxModelProps) {
  const l = dimensions.length / 100
  const w = dimensions.width / 100
  const h = dimensions.height / 100

  const isKraft = !materialType || materialType.includes("kraft")

  const outsideMap = useMemo(() => createPhotoRealisticCardboard(512, false), [])
  const insideMap = useMemo(() => createPhotoRealisticCardboard(512, true), [])

  const outsideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: isKraft ? outsideMap : undefined,
    color: isKraft ? "#C19A6B" : "#FAFAFA",
    roughness: 0.88,
    metalness: 0,
  }), [isKraft, outsideMap])

  const insideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: isKraft ? insideMap : undefined,
    color: isKraft ? "#E6D9C3" : "#F8F8F8",
    roughness: 0.92,
    metalness: 0,
  }), [isKraft, insideMap])

  const t = easeInOutCubic(openState)
  const wall = 0.006

  // Per-face art binding — deterministic 2D→3D mapping.
  const frontMat = resolveFaceMaterial(outsideMaterial, textures, "front")
  const backMat = resolveFaceMaterial(outsideMaterial, textures, "back")
  const leftMat = resolveFaceMaterial(outsideMaterial, textures, "left")
  const rightMat = resolveFaceMaterial(outsideMaterial, textures, "right")
  const topMat = resolveFaceMaterial(outsideMaterial, textures, "top")
  const bottomMat = resolveFaceMaterial(insideMaterial, textures, "bottom")

  // ===== 0427 roll-end tuck-front mailer =====
  // One full lid hinged on the back wall, a tuck flap that folds down behind
  // the front wall, and two dust flaps that fold in from the side walls.
  const lidDepth = w - wall * 2
  const tuckDepth = Math.min(h * 0.7, w * 0.55)
  const dustDepth = Math.min(w * 0.48, h * 0.55)
  const dustSpan = w * 0.94

  // Lid: 0 = flat over the opening, -106deg = leaning back, fully open.
  const lidAngle = -t * Math.PI * 0.59
  // Tuck flap: +90deg (hanging down inside the front wall) when closed,
  // nearly aligned with the lid when open.
  const tuckAngle = (Math.PI / 2) * (1 - t * 0.83)
  // Dust flaps: folded flat inside under the lid when closed; sticking out
  // ~50deg above horizontal when open.
  const dustClosed = Math.PI - 0.08
  const dustOpen = Math.PI / 4 + 0.12
  const dustAngle = dustClosed + t * (dustOpen - dustClosed)

  return (
    <group>
      {/* ===== BODY: 4 walls + bottom ===== */}
      <mesh position={[0, h / 2, w / 2]} castShadow userData={{ faceId: "front" }}>
        <boxGeometry args={[l, h, wall]} />
        <primitive object={frontMat} attach="material" />
      </mesh>
      <mesh position={[0, h / 2, -w / 2]} castShadow userData={{ faceId: "back" }}>
        <boxGeometry args={[l, h, wall]} />
        <primitive object={backMat} attach="material" />
      </mesh>
      <mesh position={[-l / 2, h / 2, 0]} castShadow userData={{ faceId: "left" }}>
        <boxGeometry args={[wall, h, w]} />
        <primitive object={leftMat} attach="material" />
      </mesh>
      <mesh position={[l / 2, h / 2, 0]} castShadow userData={{ faceId: "right" }}>
        <boxGeometry args={[wall, h, w]} />
        <primitive object={rightMat} attach="material" />
      </mesh>
      <mesh position={[0, wall / 2, 0]} receiveShadow userData={{ faceId: "bottom" }}>
        <boxGeometry args={[l - wall * 2, wall, w - wall * 2]} />
        <primitive object={bottomMat} attach="material" />
      </mesh>

      {/* ===== DUST FLAPS (fold in first, sit under the lid) ===== */}
      <group position={[-l / 2, h - wall * 2, 0]}>
        <group rotation={[0, 0, -dustAngle]}>
          <mesh position={[-dustDepth / 2, wall / 2, 0]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[dustDepth, wall, dustSpan]} />
            <primitive object={insideMaterial} attach="material" />
          </mesh>
        </group>
      </group>
      <group position={[l / 2, h - wall * 2, 0]}>
        <group rotation={[0, 0, dustAngle]}>
          <mesh position={[dustDepth / 2, wall / 2, 0]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[dustDepth, wall, dustSpan]} />
            <primitive object={insideMaterial} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ===== LID (hinged on the back wall top edge) ===== */}
      <group position={[0, h, -w / 2]}>
        <group rotation={[lidAngle, 0, 0]}>
          <mesh position={[0, wall / 2, lidDepth / 2]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[l, wall, lidDepth]} />
            <primitive object={topMat} attach="material" />
          </mesh>
          {/* Lid underside (visible when open) */}
          <mesh position={[0, -wall / 2 + 0.0001, lidDepth / 2]} userData={{ faceId: "inside_top" }}>
            <boxGeometry args={[l, 0.0001, lidDepth]} />
            <primitive object={insideMaterial} attach="material" />
          </mesh>

          {/* ===== TUCK FLAP (hinged on the lid's front edge) ===== */}
          <group position={[0, 0, lidDepth]}>
            <group rotation={[tuckAngle, 0, 0]}>
              <mesh position={[0, wall / 2, tuckDepth / 2]} castShadow userData={{ faceId: "top" }}>
                <boxGeometry args={[l * 0.96, wall, tuckDepth]} />
                <primitive object={outsideMaterial} attach="material" />
              </mesh>
              <mesh position={[0, -wall / 2 + 0.0001, tuckDepth / 2]} userData={{ faceId: "inside_top" }}>
                <boxGeometry args={[l * 0.96, 0.0001, tuckDepth]} />
                <primitive object={insideMaterial} attach="material" />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

// ============================================
// SHIPPING BOX (RSC) - فارغ من الداخل + إغلاق سلس
// ============================================
export function ShippingBox({
  dimensions,
  textures,
  backgroundColor,
  material: materialType,
  openState = 0
}: BoxModelProps) {
  const l = dimensions.length / 100
  const w = dimensions.width / 100
  const h = dimensions.height / 100

  const outsideMap = useMemo(() => createPhotoRealisticCardboard(512, false), [])
  const insideMap = useMemo(() => createPhotoRealisticCardboard(512, true), [])

  const outsideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: outsideMap,
    color: "#C19A6B",
    roughness: 0.88,
    metalness: 0,
  }), [outsideMap])

  const insideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: insideMap,
    color: "#E6D9C3",
    roughness: 0.92,
    metalness: 0,
  }), [insideMap])

  const t = easeInOutCubic(openState)
  const wall = 0.006

  const frontMat = resolveFaceMaterial(outsideMaterial, textures, "front")
  const backMat = resolveFaceMaterial(outsideMaterial, textures, "back")
  const leftMat = resolveFaceMaterial(outsideMaterial, textures, "left")
  const rightMat = resolveFaceMaterial(outsideMaterial, textures, "right")
  const topMat = resolveFaceMaterial(outsideMaterial, textures, "top")
  const bottomMat = resolveFaceMaterial(insideMaterial, textures, "bottom")

  // ===== RSC 0201 =====
  // Minor (side) flaps fold in FIRST and sit lower; major (front/back) flaps
  // fold over them and meet in the middle. Fully open = folded back ~115deg.
  const majorFlapDepth = w / 2 - wall
  const minorFlapDepth = Math.min(w / 2, l / 2) - wall

  const minorT = easeInOutCubic(Math.min(1, t * 1.6))
  const majorT = easeInOutCubic(Math.max(0, t - 0.15) / 0.85)
  const OPEN = Math.PI * 0.64 // ~115deg folded back
  const minorAngle = minorT * OPEN
  const majorAngle = majorT * OPEN

  return (
    <group>
      {/* ===== BODY: 4 walls + bottom ===== */}
      <mesh position={[0, h / 2, w / 2]} castShadow userData={{ faceId: "front" }}>
        <boxGeometry args={[l, h, wall]} />
        <primitive object={frontMat} attach="material" />
      </mesh>
      <mesh position={[0, h / 2, -w / 2]} castShadow userData={{ faceId: "back" }}>
        <boxGeometry args={[l, h, wall]} />
        <primitive object={backMat} attach="material" />
      </mesh>
      <mesh position={[-l / 2, h / 2, 0]} castShadow userData={{ faceId: "left" }}>
        <boxGeometry args={[wall, h, w]} />
        <primitive object={leftMat} attach="material" />
      </mesh>
      <mesh position={[l / 2, h / 2, 0]} castShadow userData={{ faceId: "right" }}>
        <boxGeometry args={[wall, h, w]} />
        <primitive object={rightMat} attach="material" />
      </mesh>
      <mesh position={[0, wall / 2, 0]} receiveShadow userData={{ faceId: "bottom" }}>
        <boxGeometry args={[l - wall * 2, wall, w - wall * 2]} />
        <primitive object={bottomMat} attach="material" />
      </mesh>

      {/* ===== MINOR FLAPS (side, lower layer) ===== */}
      <group position={[-l / 2, h, 0]}>
        <group rotation={[0, 0, minorAngle]}>
          <mesh position={[minorFlapDepth / 2, wall / 2, 0]} castShadow userData={{ faceId: "inside_left" }}>
            <boxGeometry args={[minorFlapDepth, wall, w - wall * 2]} />
            <primitive object={insideMaterial} attach="material" />
          </mesh>
        </group>
      </group>
      <group position={[l / 2, h, 0]}>
        <group rotation={[0, 0, -minorAngle]}>
          <mesh position={[-minorFlapDepth / 2, wall / 2, 0]} castShadow userData={{ faceId: "inside_right" }}>
            <boxGeometry args={[minorFlapDepth, wall, w - wall * 2]} />
            <primitive object={insideMaterial} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ===== MAJOR FLAPS (front/back, top layer, meet in the middle) ===== */}
      <group position={[0, h + wall * 1.5, w / 2]}>
        <group rotation={[majorAngle, 0, 0]}>
          <mesh position={[0, wall / 2, -majorFlapDepth / 2]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[l, wall, majorFlapDepth]} />
            <primitive object={topMat} attach="material" />
          </mesh>
        </group>
      </group>
      <group position={[0, h + wall * 1.5, -w / 2]}>
        <group rotation={[-majorAngle, 0, 0]}>
          <mesh position={[0, wall / 2, majorFlapDepth / 2]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[l, wall, majorFlapDepth]} />
            <primitive object={topMat} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ============================================
// RIGID BOX (Two-piece) - فارغ من الداخل
// ============================================
export function RigidBox({
  dimensions,
  textures,
  backgroundColor,
  material: materialType,
  openState = 0
}: BoxModelProps) {
  

  const l = dimensions.length / 100
  const w = dimensions.width / 100
  const h = dimensions.height / 100

  const isKraft = materialType?.includes("kraft")
  const outsideMap = useMemo(() => createPhotoRealisticCardboard(512, false), [])
  const insideMap = useMemo(() => createPhotoRealisticCardboard(512, true), [])

  const outsideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: isKraft ? outsideMap : undefined,
    color: isKraft ? "#D4B896" : "#FEFEFE",
    roughness: isKraft ? 0.85 : 0.2,
    metalness: 0,
  }), [isKraft, outsideMap])

  const insideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: isKraft ? insideMap : undefined,
    color: isKraft ? "#F0E6D3" : "#F5F5F5",
    roughness: 0.9,
    metalness: 0,
  }), [isKraft, insideMap])

  const t = easeInOutCubic(openState)
  const wall = 0.008

  const lidHeight = h * 0.3
  const baseHeight = h * 0.7
  const lidOver = wall * 3 // lid closes OVER the base, scaled to board thickness

  // Smooth lift and tilt
  const lidLift = t * h * 0.6
  const lidTilt = t * (-Math.PI / 5)

  return (
    <group>
      {/* ===== BASE (hollow) ===== */}
      {/* 4 walls */}
      <mesh position={[0, baseHeight / 2, w / 2 - wall / 2]} castShadow userData={{ faceId: "front" }}>
        <boxGeometry args={[l, baseHeight, wall]} />
        <primitive object={outsideMaterial} attach="material" />
      </mesh>
      <mesh position={[0, baseHeight / 2, -w / 2 + wall / 2]} castShadow userData={{ faceId: "back" }}>
        <boxGeometry args={[l, baseHeight, wall]} />
        <primitive object={outsideMaterial} attach="material" />
      </mesh>
      <mesh position={[-l / 2 + wall / 2, baseHeight / 2, 0]} castShadow userData={{ faceId: "left" }}>
        <boxGeometry args={[wall, baseHeight, w]} />
        <primitive object={outsideMaterial} attach="material" />
      </mesh>
      <mesh position={[l / 2 - wall / 2, baseHeight / 2, 0]} castShadow userData={{ faceId: "right" }}>
        <boxGeometry args={[wall, baseHeight, w]} />
        <primitive object={outsideMaterial} attach="material" />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, wall / 2, 0]} receiveShadow userData={{ faceId: "bottom" }}>
        <boxGeometry args={[l - wall * 2, wall, w - wall * 2]} />
        <primitive object={insideMaterial} attach="material" />
      </mesh>

      {/* ===== LID (hollow, slightly larger) ===== */}
      <group position={[0, baseHeight + lidLift, -t * w * 0.1]} rotation={[lidTilt, 0, 0]}>
        {/* 4 walls */}
        <mesh position={[0, lidHeight / 2, (w + lidOver) / 2 - wall / 2]} castShadow userData={{ faceId: "top" }}>
          <boxGeometry args={[l + lidOver, lidHeight, wall]} />
          <primitive object={outsideMaterial} attach="material" />
        </mesh>
        <mesh position={[0, lidHeight / 2, -(w + lidOver) / 2 + wall / 2]} castShadow userData={{ faceId: "top" }}>
          <boxGeometry args={[l + lidOver, lidHeight, wall]} />
          <primitive object={outsideMaterial} attach="material" />
        </mesh>
        <mesh position={[-(l + lidOver) / 2 + wall / 2, lidHeight / 2, 0]} castShadow userData={{ faceId: "top" }}>
          <boxGeometry args={[wall, lidHeight, w + lidOver]} />
          <primitive object={outsideMaterial} attach="material" />
        </mesh>
        <mesh position={[(l + lidOver) / 2 - wall / 2, lidHeight / 2, 0]} castShadow userData={{ faceId: "top" }}>
          <boxGeometry args={[wall, lidHeight, w + lidOver]} />
          <primitive object={outsideMaterial} attach="material" />
        </mesh>
        {/* Top */}
        <mesh position={[0, lidHeight - wall / 2, 0]} castShadow userData={{ faceId: "top" }}>
          <boxGeometry args={[l + lidOver - wall * 2, wall, w + lidOver - wall * 2]} />
          <primitive object={outsideMaterial} attach="material" />
        </mesh>
        {/* Inside bottom */}
        <mesh position={[0, wall / 2, 0]} userData={{ faceId: "top" }}>
          <boxGeometry args={[l - wall * 2, wall, w - wall * 2]} />
          <primitive object={insideMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  )
}

// ============================================
// GIFT BOX (Alias for RigidBox)
// ============================================
export function GiftBox(props: BoxModelProps) {
  return <RigidBox {...props} />
}

// ============================================
// FOLDING CARTON - فارغ + إغلاق سلس
// ============================================
export function FoldingCarton({
  dimensions,
  textures,
  backgroundColor,
  material: materialType,
  openState = 0
}: BoxModelProps) {
  const l = dimensions.length / 100
  const w = dimensions.width / 100
  const h = dimensions.height / 100

  const isKraft = materialType?.includes("kraft")
  const outsideMap = useMemo(() => createPhotoRealisticCardboard(512, false), [])
  const insideMap = useMemo(() => createPhotoRealisticCardboard(512, true), [])

  const outsideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: isKraft ? outsideMap : undefined,
    color: isKraft ? "#C19A6B" : "#FEFEFE",
    roughness: isKraft ? 0.88 : 0.55,
    metalness: 0,
  }), [isKraft, outsideMap])

  const insideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: isKraft ? insideMap : undefined,
    color: isKraft ? "#E6D9C3" : "#F5F5F5",
    roughness: 0.92,
    metalness: 0,
  }), [isKraft, insideMap])

  const t = easeInOutCubic(openState)
  const wall = 0.004

  const frontMat = resolveFaceMaterial(outsideMaterial, textures, "front")
  const backMat = resolveFaceMaterial(outsideMaterial, textures, "back")
  const leftMat = resolveFaceMaterial(outsideMaterial, textures, "left")
  const rightMat = resolveFaceMaterial(outsideMaterial, textures, "right")
  const topMat = resolveFaceMaterial(outsideMaterial, textures, "top")
  const bottomMat = resolveFaceMaterial(insideMaterial, textures, "bottom")

  // ===== Straight tuck end =====
  // Lid hinged on the back wall covers the opening; a short tuck tongue folds
  // down behind the front wall; small dust flaps fold in from the sides.
  const lidDepth = w - wall * 2
  const tuckDepth = Math.min(h * 0.3, w * 0.45)
  const dustDepth = Math.min(w * 0.4, h * 0.28)

  const lidAngle = -t * Math.PI * 0.59
  const tuckAngle = (Math.PI / 2) * (1 - t * 0.83)
  const dustClosed = Math.PI - 0.08
  const dustOpen = Math.PI / 4 + 0.12
  const dustAngle = dustClosed + t * (dustOpen - dustClosed)

  return (
    <group>
      {/* ===== BODY: 4 walls + glued bottom ===== */}
      <mesh position={[0, h / 2, w / 2 - wall / 2]} castShadow userData={{ faceId: "front" }}>
        <boxGeometry args={[l, h, wall]} />
        <primitive object={frontMat} attach="material" />
      </mesh>
      <mesh position={[0, h / 2, -w / 2 + wall / 2]} castShadow userData={{ faceId: "back" }}>
        <boxGeometry args={[l, h, wall]} />
        <primitive object={backMat} attach="material" />
      </mesh>
      <mesh position={[-l / 2 + wall / 2, h / 2, 0]} castShadow userData={{ faceId: "left" }}>
        <boxGeometry args={[wall, h, w - wall * 2]} />
        <primitive object={leftMat} attach="material" />
      </mesh>
      <mesh position={[l / 2 - wall / 2, h / 2, 0]} castShadow userData={{ faceId: "right" }}>
        <boxGeometry args={[wall, h, w - wall * 2]} />
        <primitive object={rightMat} attach="material" />
      </mesh>
      <mesh position={[0, wall / 2, 0]} receiveShadow userData={{ faceId: "bottom" }}>
        <boxGeometry args={[l - wall * 2, wall, w - wall * 2]} />
        <primitive object={bottomMat} attach="material" />
      </mesh>

      {/* ===== DUST FLAPS ===== */}
      <group position={[-l / 2 + wall, h - wall * 2, 0]}>
        <group rotation={[0, 0, -dustAngle]}>
          <mesh position={[-dustDepth / 2, wall / 2, 0]} castShadow userData={{ faceId: "inside_left" }}>
            <boxGeometry args={[dustDepth, wall, (w - wall * 2) * 0.92]} />
            <primitive object={insideMaterial} attach="material" />
          </mesh>
        </group>
      </group>
      <group position={[l / 2 - wall, h - wall * 2, 0]}>
        <group rotation={[0, 0, dustAngle]}>
          <mesh position={[dustDepth / 2, wall / 2, 0]} castShadow userData={{ faceId: "inside_right" }}>
            <boxGeometry args={[dustDepth, wall, (w - wall * 2) * 0.92]} />
            <primitive object={insideMaterial} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ===== TUCK LID (hinged on the back wall top edge) ===== */}
      <group position={[0, h, -w / 2 + wall]}>
        <group rotation={[lidAngle, 0, 0]}>
          <mesh position={[0, wall / 2, lidDepth / 2]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[l, wall, lidDepth]} />
            <primitive object={topMat} attach="material" />
          </mesh>
          <mesh position={[0, -wall / 2 + 0.0001, lidDepth / 2]} userData={{ faceId: "inside_top" }}>
            <boxGeometry args={[l, 0.0001, lidDepth]} />
            <primitive object={insideMaterial} attach="material" />
          </mesh>

          {/* Tuck tongue on the lid's front edge */}
          <group position={[0, 0, lidDepth]}>
            <group rotation={[tuckAngle, 0, 0]}>
              <mesh position={[0, wall / 2, tuckDepth / 2]} castShadow userData={{ faceId: "top" }}>
                <boxGeometry args={[l * 0.82, wall, tuckDepth]} />
                <primitive object={outsideMaterial} attach="material" />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

// ============================================
// PIZZA BOX - فارغ + غطاء مفصلي سلس
// ============================================
export function PizzaBox({
  dimensions,
  textures,
  backgroundColor,
  material: materialType,
  openState = 0
}: BoxModelProps) {
  const size = dimensions.length / 100
  const h = dimensions.height / 100

  const outsideMap = useMemo(() => createPhotoRealisticCardboard(512, false), [])
  const insideMap = useMemo(() => createPhotoRealisticCardboard(512, true), [])

  const outsideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: outsideMap,
    color: "#C19A6B",
    roughness: 0.88,
    metalness: 0,
  }), [outsideMap])

  const insideMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: insideMap,
    color: "#E6D9C3",
    roughness: 0.92,
    metalness: 0,
  }), [insideMap])

  const t = easeInOutCubic(openState)
  // Lid opens to ~100deg (just past vertical).
  const lidAngle = t * (-Math.PI * 0.55)

  const wall = 0.008
  const lidHeight = h * 0.28
  const baseHeight = h * 0.72
  // Lid is one board thickness larger per side so it closes OVER the base
  // instead of z-fighting with the base walls.
  const lidSize = size + wall * 2.5

  const topMat = resolveFaceMaterial(outsideMaterial, textures, "top")
  const bottomMat = resolveFaceMaterial(insideMaterial, textures, "bottom")

  return (
    <group>
      {/* ===== BASE (hollow) ===== */}
      <mesh position={[0, baseHeight / 2, size / 2 - wall / 2]} castShadow userData={{ faceId: "front" }}>
        <boxGeometry args={[size, baseHeight, wall]} />
        <primitive object={outsideMaterial} attach="material" />
      </mesh>
      <mesh position={[0, baseHeight / 2, -size / 2 + wall / 2]} castShadow userData={{ faceId: "back" }}>
        <boxGeometry args={[size, baseHeight, wall]} />
        <primitive object={outsideMaterial} attach="material" />
      </mesh>
      <mesh position={[-size / 2 + wall / 2, baseHeight / 2, 0]} castShadow userData={{ faceId: "left" }}>
        <boxGeometry args={[wall, baseHeight, size]} />
        <primitive object={outsideMaterial} attach="material" />
      </mesh>
      <mesh position={[size / 2 - wall / 2, baseHeight / 2, 0]} castShadow userData={{ faceId: "right" }}>
        <boxGeometry args={[wall, baseHeight, size]} />
        <primitive object={outsideMaterial} attach="material" />
      </mesh>
      <mesh position={[0, wall / 2, 0]} receiveShadow userData={{ faceId: "bottom" }}>
        <boxGeometry args={[size - wall * 2, wall, size - wall * 2]} />
        <primitive object={bottomMat} attach="material" />
      </mesh>

      {/* ===== LID (hinged at the back top edge, hollow, slightly larger) ===== */}
      <group position={[0, baseHeight, -size / 2 + wall / 2]}>
        <group rotation={[lidAngle, 0, 0]}>
          {/* Front lip of the lid */}
          <mesh position={[0, lidHeight / 2, lidSize - wall / 2]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[lidSize, lidHeight, wall]} />
            <primitive object={outsideMaterial} attach="material" />
          </mesh>
          {/* Lid side walls */}
          <mesh position={[-lidSize / 2 + wall / 2, lidHeight / 2, lidSize / 2]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[wall, lidHeight, lidSize]} />
            <primitive object={outsideMaterial} attach="material" />
          </mesh>
          <mesh position={[lidSize / 2 - wall / 2, lidHeight / 2, lidSize / 2]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[wall, lidHeight, lidSize]} />
            <primitive object={outsideMaterial} attach="material" />
          </mesh>
          {/* Lid top panel */}
          <mesh position={[0, lidHeight - wall / 2, lidSize / 2]} castShadow userData={{ faceId: "top" }}>
            <boxGeometry args={[lidSize - wall * 2, wall, lidSize - wall * 2]} />
            <primitive object={topMat} attach="material" />
          </mesh>
          {/* Lid inside */}
          <mesh position={[0, wall / 2, lidSize / 2]} userData={{ faceId: "inside_top" }}>
            <boxGeometry args={[lidSize - wall * 2, wall, lidSize - wall * 2]} />
            <primitive object={insideMaterial} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ============================================
// PAPER CUP
// ============================================
export function PaperCup({
  dimensions,
  backgroundColor,
  material: materialType
}: BoxModelProps) {
  

  const topR = dimensions.width / 200
  const bottomR = dimensions.length / 250
  const h = dimensions.height / 100

  const isKraft = materialType?.includes("kraft")
  const cupColor = isKraft ? "#8B7355" : "#FFFFFF"

  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[topR, bottomR, h, 48, 1, true]} />
        <meshStandardMaterial color={cupColor} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Bottom */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[bottomR, 48]} />
        <meshStandardMaterial color={cupColor} roughness={0.7} />
      </mesh>

      {/* Rim */}
      <mesh position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[topR, 0.006, 12, 48]} />
        <meshStandardMaterial color={cupColor} roughness={0.5} />
      </mesh>
    </group>
  )
}

// ============================================
// CARRIER BAG
// ============================================
export function CarrierBag({
  dimensions,
  backgroundColor,
  material: materialType
}: BoxModelProps) {
  

  const l = dimensions.length / 100
  const w = dimensions.width / 100
  const h = dimensions.height / 100

  const isKraft = materialType?.includes("kraft")
  const bagColor = isKraft ? "#8B7355" : "#FFFFFF"

  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[l, h, w * 0.15]} />
        <meshStandardMaterial color={bagColor} roughness={0.85} />
      </mesh>

      {/* Handles */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * l * 0.25, h + l * 0.08, 0]}>
          <torusGeometry args={[l * 0.1, 0.006, 8, 24, Math.PI]} />
          <meshStandardMaterial color={bagColor} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ============================================
// STAND UP POUCH
// ============================================
export function StandUpPouch({
  dimensions,
  backgroundColor,
  material: materialType
}: BoxModelProps) {
  

  const l = dimensions.length / 100
  const h = dimensions.height / 100

  const pouchColor = materialType?.includes("kraft") ? "#8B7355" : "#FFFFFF"

  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[l * 0.9, h, 0.025]} />
        <meshStandardMaterial color={pouchColor} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Bottom gusset */}
      <mesh position={[0, 0.015, 0]} rotation={[Math.PI / 8, 0, 0]} castShadow>
        <boxGeometry args={[l * 0.85, 0.02, 0.04]} />
        <meshStandardMaterial color={pouchColor} roughness={0.4} />
      </mesh>

      {/* Zipper */}
      <mesh position={[0, h - 0.015, 0]}>
        <boxGeometry args={[l * 0.85, 0.012, 0.03]} />
        <meshStandardMaterial color="#444444" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  )
}

// ============================================
// TUBE
// ============================================
export function Tube({
  dimensions,
  backgroundColor,
  material: materialType
}: BoxModelProps) {
  

  const r = dimensions.width / 200
  const h = dimensions.height / 100

  const tubeColor = materialType?.includes("kraft") ? "#8B7355" : "#F5F5F5"

  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 48]} />
        <meshStandardMaterial color={tubeColor} roughness={0.8} />
      </mesh>

      {/* Metal cap */}
      <mesh position={[0, h + 0.008, 0]}>
        <cylinderGeometry args={[r * 1.05, r * 1.05, 0.02, 48]} />
        <meshStandardMaterial color="#B8B8B8" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Bottom */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r, 48]} />
        <meshStandardMaterial color={tubeColor} roughness={0.8} />
      </mesh>
    </group>
  )
}

// ============================================
// ENVELOPE
// ============================================
export function Envelope({
  dimensions,
  backgroundColor,
  material: materialType
}: BoxModelProps) {
  

  const l = dimensions.length / 100
  const h = dimensions.height / 100

  const envColor = materialType?.includes("kraft") ? "#8B7355" : "#F8F8F8"

  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[l, h * 0.7, 0.006]} />
        <meshStandardMaterial color={envColor} roughness={0.85} />
      </mesh>

      {/* Flap */}
      <mesh position={[0, h * 0.35, -0.004]} rotation={[Math.PI / 7, 0, 0]} castShadow>
        <boxGeometry args={[l, h * 0.28, 0.004]} />
        <meshStandardMaterial color={envColor} roughness={0.85} />
      </mesh>
    </group>
  )
}

// ============================================
// LABEL — flat rectangular die-cut label
// ============================================
export function Label({
  dimensions,
  textures,
  backgroundColor,
  material: materialType
}: BoxModelProps) {
  

  const l = dimensions.length / 100
  const h = dimensions.height / 100
  const baseColor = materialType?.includes("kraft") ? "#D4B896" : "#F8F8F8"
  const baseMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.8 }),
    [baseColor]
  )
  const faceMat = resolveFaceMaterial(baseMat, textures, "front")

  return (
    <group>
      <mesh castShadow userData={{ faceId: "front" }}>
        <boxGeometry args={[l, h, 0.003]} />
        <primitive object={faceMat} attach="material" />
      </mesh>
    </group>
  )
}

// ============================================
// MODEL FACTORY
// ============================================
export function getBoxModel(type: string) {
  const t = type.toLowerCase().replace(/_/g, "-")

  switch (t) {
    case "mailer-box":
    case "custom-mailer-box":
      return MailerBox
    case "shipping-box":
    case "custom-shipping-box":
      return ShippingBox
    case "rigid-box":
    case "custom-rigid-box":
      return RigidBox
    case "gift-box":
      return GiftBox
    case "folding-carton":
      return FoldingCarton
    case "pizza-box":
    case "custom-pizza-box":
      return PizzaBox
    case "cup":
    case "paper-cup":
      return PaperCup
    case "bag":
    case "paper-bag":
    case "carrier-bag":
      return CarrierBag
    case "pouch":
    case "stand-up-pouch":
    case "doypack":
      return StandUpPouch
    case "tube":
    case "cardboard-tube":
      return Tube
    case "envelope":
    case "mailer-envelope":
      return Envelope
    case "label":
    case "rectangle-label":
    case "circle-label":
    case "square-label":
    case "labels-sheet":
      return Label
    default:
      return MailerBox
  }
}

// Export for external use
export { createCardboardMaterial, createNoiseTexture, createFiberNormalMap }
