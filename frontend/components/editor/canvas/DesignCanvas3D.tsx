"use client"

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react"
import { getBoxModel, setArtworkLightScale } from "@/components/design-editor/models/BoxModels"
import { useDesignStore } from "@/lib/editor/state/store"
import { intersectionFaceId } from "@/lib/editor/geometry/intersection-face"
import { generateReliefMasks } from "@/lib/editor/services/relief-masks"
import { generateTextureFromLayers } from "@/lib/editor/services/texture-generator"
import { setTexturesPending } from "@/lib/editor/services/texture-status"
import { Stage, ContactShadows, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import type { FaceId } from "@/lib/editor/state/types"

interface DesignCanvas3DProps {
  productType?: string
}

// Loading fallback
function LoadingBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 0.5, 0.8]} />
      <meshStandardMaterial color="#e0d0c0" wireframe />
    </mesh>
  )
}

/**
 * M7-D: resolves a raycast intersection to a stable Face ID via the explicit
 * `mesh.userData.faceId` metadata attached to every printable surface in
 * BoxModels. The id must come from the ProductStructure face list (model.faces);
 * anything else (decorative meshes, ground, shadows) is ignored.
 */
function useFaceValidity() {
  return useCallback((faceId: string): boolean => {
    const faces = useDesignStore.getState().model.faces
    if (faces.some((f) => f.id === faceId)) return true
    // `inside_*` faces map to their outer ProductStructure sibling.
    return faces.some((f) => f.id === faceId.replace("inside_", ""))
  }, [])
}

/**
 * M7-D: selection highlight — dims every printable mesh belonging to the
 * currently selected face by swapping in a cloned (emissive) material. The
 * clone is reverted when the selection changes or the component/effect re-runs,
 * so shared fallback materials are never mutated across faces.
 */
function FaceHighlight({ selectedFace }: { selectedFace: FaceId }) {
  const { scene } = useThree()
  const model = useDesignStore((s) => s.model)
  const layers = useDesignStore((s) => s.layers)

  useEffect(() => {
    // Outline the selected face instead of tinting it: an amber emissive
    // clone repainted the whole face tan and masked the real board color.
    const attached: Array<{ mesh: THREE.Mesh; line: THREE.LineSegments }> = []
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const fid = (mesh.userData as any)?.faceId
      const inner = (mesh.userData as any)?.insideFaceId
      if ((!fid || fid !== selectedFace) && inner !== selectedFace) return
      const line = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 30),
        new THREE.LineBasicMaterial({ color: "#1d4ed8" })
      )
      ;(line as any).__m7dFaceOutline = true
      mesh.add(line)
      attached.push({ mesh, line })
    })
    return () => {
      attached.forEach(({ mesh, line }) => {
        mesh.remove(line)
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      })
    }
  }, [scene, selectedFace, model, layers])

  return null
}

/**
 * M7-D: gentle continuous rotation of the physical model (standard packaging
 * preview behaviour). Exposes a small harness (`__editorSpinBox`) so E2E tests
 * can pin the box to a fixed azimuth; picking itself always uses the real
 * raycaster — this only turns the model like a user turntable.
 */
const spinConfig = {
  active: true,
  speed: 0.5,
  yOverride: null as number | null,
}

function SpinBox({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g) return
    if (spinConfig.yOverride !== null) {
      g.rotation.y = spinConfig.yOverride
    } else if (spinConfig.active) {
      g.rotation.y += delta * spinConfig.speed
    }
  })
  useEffect(() => {
    ;(window as any).__editorSpinBox = spinConfig
    return () => {
      delete (window as any).__editorSpinBox
    }
  }, [])
  return <group ref={groupRef}>{children}</group>
}

/**
 * M7-D E2E harness: drives the REAL raycaster against the REAL scene and camera
 * (no fake picking) and applies the same selection path used by pointer clicks.
 *   - __editorPickFace(clientX, clientY[, {apply}]) -> NDC via live canvas rect,
 *     raycast, pick first hit carrying userData.faceId, return faceId (or null).
 *   - __editorPickFaceAt(ndcX, ndcY[, {apply}]) -> same, with explicit NDC.
 *   - __editorPickScan({step}) -> grid-scan NDC with the SAME raycast path and
 *     returns every distinct faceId currently visible + a hit ndc for each.
 *   - __editor3DFaces() -> per tagged mesh {faceId, position, ndc, visible}
 *     for projecting / aiming deterministic probes.
 */
function PickBridge() {
  const { scene, camera, gl } = useThree()
  const isValidFace = useFaceValidity()

  useEffect(() => {
    const pickAtNdc = (ndcX: number, ndcY: number, opts?: { apply?: boolean }) => {
      const mouse = new THREE.Vector2(ndcX, ndcY)
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObject(scene, true)
      for (const hit of hits) {
        const fid = intersectionFaceId(hit)
        if (fid && isValidFace(fid)) {
          if (opts?.apply !== false) {
            useDesignStore.getState().setSelectedFace(fid as FaceId)
          }
          return fid
        }
      }
      return null
    }

    const pickAtClient = (clientX: number, clientY: number, opts?: { apply?: boolean }) => {
      const rect = gl.domElement.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1)
      return pickAtNdc(ndcX, ndcY, opts)
    }

    const faces3D = () => {
      const out: Array<{
        faceId: string
        position: [number, number, number]
        ndc: [number, number, number]
        visible: boolean
      }> = []
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        const fid = (mesh.userData as any)?.faceId as string | undefined
        if (!fid || !mesh.isMesh) return
        const pos = new THREE.Vector3()
        mesh.getWorldPosition(pos)
        const ndc = pos.clone().project(camera)
        const v =
          ndc.x >= -1 && ndc.x <= 1 && ndc.y >= -1 && ndc.y <= 1 && ndc.z >= -1 && ndc.z <= 1
        out.push({
          faceId: fid,
          position: [pos.x, pos.y, pos.z],
          ndc: [ndc.x, ndc.y, ndc.z],
          visible: v,
        })
      })
      return out
    }

    const pickScan = (opts?: { step?: number }) => {
      const step = opts?.step ?? 0.05
      const seen = new Map<string, { ndc: [number, number] }>()
      for (let y = -1; y <= 1; y += step) {
        for (let x = -1; x <= 1; x += step) {
          const fid = pickAtNdc(x, y, { apply: false })
          if (fid && !seen.has(fid)) {
            seen.set(fid, { ndc: [x, y] })
          }
        }
      }
      return Array.from(seen.entries()).map(([faceId, p]) => ({ faceId, ndc: p.ndc }))
    }

    ;(window as any).__editorPickFace = pickAtClient
    ;(window as any).__editorPickFaceAt = pickAtNdc
    ;(window as any).__editorPickScan = pickScan
    ;(window as any).__editor3DFaces = faces3D
    ;(window as any).__r3fGetter = () => {
      const s: any = (useThree as any).getState?.()
      return s
        ? {
            pointer: { x: s.pointer.x, y: s.pointer.y },
            size: { width: s.size.width, height: s.size.height },
          }
        : null
    }
    return () => {
      delete (window as any).__editorPickFace
      delete (window as any).__editorPickFaceAt
      delete (window as any).__editorPickScan
      delete (window as any).__editor3DFaces
      delete (window as any).__r3fGetter
    }
  }, [scene, camera, gl, isValidFace])

  return null
}

function CameraFillLight({ intensity, layer }: { intensity: number; layer?: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)
  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current
      if (layer !== undefined) lightRef.current.layers.set(layer)
    }
  }, [layer])
  useFrame(({ camera }) => {
    // Headlight: keep the light at the camera so faces toward the viewer
    // are lit; angle to the key light still varies, preserving shading.
    lightRef.current?.position.copy(camera.position)
  })
  return (
    <>
      <directionalLight ref={lightRef} intensity={intensity} />
      <object3D ref={targetRef} position={[0, 0, 0]} />
    </>
  )
}

export function DesignCanvas3D({ productType }: DesignCanvas3DProps) {
  const model = useDesignStore((s) => s.model)
  const layers = useDesignStore((s) => s.layers)
  const canvas = useDesignStore((s) => s.canvas)
  const boxOpenState = useDesignStore((s) => s.ui.boxOpenState)

  // Open-lid framing compensation: the opened lid doubles the box height, so
  // with the closed-box camera the lid clips the top of the canvas. Dolly the
  // camera out and raise the orbit target in proportion to openState (the
  // footer slider drives partial states too). Relative scaling keeps user
  // zoom intact and never remounts the Canvas.
  const controlsRef = useRef<any>(null)
  const openZoomAppliedRef = useRef(1)
  useEffect(() => {
    const want = 1 + 0.55 * boxOpenState
    const f = want / openZoomAppliedRef.current
    const c = controlsRef.current
    if (c && Math.abs(f - 1) > 0.001) {
      c.object.position.multiplyScalar(f)
      c.update()
    }
    openZoomAppliedRef.current = want
    if (c) {
      c.target.y = ((model.dimensions.height / 100) / 2) * (1 + 0.6 * boxOpenState)
      c.update()
    }
  }, [boxOpenState])
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)
  const setSelectedFace = useDesignStore((s) => s.setSelectedFace)
  const isValidFace = useFaceValidity()

  // M7-D: physical-surface pick. The primary (and only) face resolution path is
  // the explicit mesh.userData.faceId, validated against ProductStructure faces.
  // No normal-based guessing, array indices or hard-coded coordinates.
  const handleFaceSelect = (e: any) => {
    if (!e?.intersections?.length) return
    // Preserve orbit interaction: dragging the view must never select a face.
    if (typeof e.delta === "number" && e.delta > 6) return
    // R3F forwards the handler once per intersected descendant mesh (in
    // distance order). Resolve the physical surface under the cursor as the
    // NEAREST tagged hit rather than trusting the single e.object (which would
    // be last-write-wins and favor the farthest face).
    const nearestTagged = (e.intersections as any[])
      .map((h: any) => ({
        faceId: intersectionFaceId(h),
        distance: h?.distance,
      }))
      .find((h: any) => h.faceId && isValidFace(h.faceId))
    if (!nearestTagged) return
    setSelectedFace(nearestTagged.faceId as FaceId)
  }

  const reliefMasks = useMemo(() => generateReliefMasks(layers, model), [layers, model])
  const [faceTextures, setFaceTextures] = useState<Record<string, string>>({})

  // Generate textures for each face — keyed by the SAME stable Face IDs used on
  // the 3D meshes, so 2D artwork maps deterministically onto picked faces.
  useEffect(() => {
    let active = true
    const updateTextures = async () => {
      setTexturesPending(true)
      try {
        const textures = await generateTextureFromLayers(layers, model, {
          scale: 4,
          backgroundColor: canvas.backgroundColor,
        })
        if (active) {
          setFaceTextures(textures)
        }
      } catch (error) {
        console.error("Error generating textures:", error)
      } finally {
        setTexturesPending(false)
      }
    }
    updateTextures()
    return () => {
      active = false
    }
  }, [layers, model, canvas.backgroundColor])

  const type = model.type.replace(/_/g, "-")
  const BoxModel = getBoxModel(type)

  // Camera distance follows the box size: small cartons and large shipping
  // boxes must both fit the frame (previously fixed, which cropped big boxes
  // and swallowed small ones, and an open lid filled the whole view).
  const boostWhite = useMemo(() => {
    if (model.boardSpecification) return false
    const m = (model.material || "").toLowerCase()
    // أبيض مستورد family only; Egyptian white (local / corrugated-white)
    // intentionally stays duller, and kraft is untouched.
    return (
      (m.includes("white") || m.includes("coated") || m.includes("premium") || m.startsWith("paper-")) &&
      !m.includes("local") &&
      !m.startsWith("corrugated-white")
    )
  }, [model.material, model.boardSpecification])

  // Gated test hooks (editorDebug URL param only): __editorStore handle and a
  // noBoost override for same-build boost on/off comparisons.
  const debugOn = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("editorDebug")
  const boostActive = boostWhite && !(debugOn && new URLSearchParams(window.location.search).has("noBoost"))
  // Set during render (not an effect) so child BoxModels resolve printed-face
  // materials with the current scale in the same pass.
  setArtworkLightScale(boostActive ? 0.32 : 1)

  // Test/debug handle, same pattern as __editorSpinBox: lets Playwright
  // deselect layers and switch materials without fighting sidebar UI.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("editorDebug")) return
    ;(window as any).__editorStore = useDesignStore
    return () => {
      delete (window as any).__editorStore
    }
  }, [])

  const dims = model.dimensions
  const maxDim = Math.max(dims.length, dims.width, dims.height || 1) / 100
  const camDist = Math.max(1.6, maxDim * 2.4 + 0.9)
  const camPos: [number, number, number] = [camDist * 0.62, camDist * 0.5, camDist * 0.62]
  // Calculate box center for camera target
  const boxCenterY = (model.dimensions.height / 100) / 2

  return (
    <div className="w-full h-full" style={{ background: "#f8f8f8" }}>
      <Canvas
        key={camDist.toFixed(2)}
        shadows
        dpr={[1, 2]}
        camera={{ position: camPos, fov: 38 }}
        onCreated={({ camera }) => camera.layers.enable(1)}
        gl={{
          antialias: true,
          // AgX: no ACES warm hue-skew in mid-tones, so white board stays
          // neutral instead of rendering cream.
          toneMapping: THREE.AgXToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        {/* خلفية رمادية فاتحة */}
        <color attach="background" args={["#f8f8f8"]} />

        <PickBridge />
        <FaceHighlight selectedFace={selectedFace} />

        {/* إضاءة واقعية للكرتون */}
        <ambientLight intensity={0.3} />

        {/* إضاءة رئيسية (key light) */}
        <directionalLight
          position={[5, 8, 6]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-camera-far={30}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          shadow-bias={-0.0002}
        />

        {/* إضاءة ملء (fill light) */}
        <directionalLight position={[-4, 5, -4]} intensity={0.4} />

        {/* إضاءة خلفية (rim light) */}
        <directionalLight position={[0, 3, -6]} intensity={0.35} />

        {/* إضاءة نصف كروية للمحيط */}
        <hemisphereLight intensity={0.4} groundColor="#8C8C8C" color="#ffffff" />

        {/* إضاءة تتبع الكاميرا: ترفع الأوجه المواجهة للمشاهد بدون تسطيح الظلال */}
        <CameraFillLight intensity={0.55} />

        {/* White-board boost rig: imported white reads paper-white only
            under stronger studio light; kraft/Egyptian white stay on the
            shared rig. */}
        {boostActive && (
          <>
            {/* The box is the only lit object in this scene (background is a
                flat color, shadows are ContactShadows), so mounting this rig
                only while an imported-white material is active IS the scoping:
                kraft and Egyptian white never see it. */}
            <directionalLight position={[4, 7, 5]} intensity={5.5} />
            <directionalLight position={[-1, 3, 8]} intensity={1.8} />
            <CameraFillLight intensity={2.2} />
          </>
        )}


        {/* ظل ناعم على الأرض */}
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.45}
          scale={8}
          blur={2.8}
          far={3}
          color="#3a3a3a"
        />

        {/* الظل الأرضي: ContactShadows فقط — مستوى shadowMaterial كان يرسم
            ظلًا صلب الحواف يبدو كورقة بيضاء بجانب الصندوق */}

        {/* نموذج الصندوق */}
        <Suspense fallback={<LoadingBox />}>
          <SpinBox>
            <group
              position={[0, 0, 0]}
              onClick={handleFaceSelect}
            >
              <BoxModel
                dimensions={model.dimensions}
                type={type}
                material={model.material}
                boardSpecification={model.boardSpecification}
                printCoverage={model.printCoverage}
                textures={faceTextures}
                reliefMasks={reliefMasks}
                backgroundColor={canvas.backgroundColor}
                openState={boxOpenState}
              />
            </group>
          </SpinBox>
        </Suspense>

        {/* تحكم الكاميرا */}
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={camDist * 0.35}
          maxDistance={camDist * 2.6}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={false}
          target={[0, boxCenterY, 0]}
        />
      </Canvas>
    </div>
  )
}