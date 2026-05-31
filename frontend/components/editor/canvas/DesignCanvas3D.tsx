"use client"

import { Canvas } from "@react-three/fiber"
import { useState, useEffect, Suspense } from "react"
import { getBoxModel } from "@/components/design-editor/models/BoxModels"
import { SceneSetup } from "@/components/design-editor/3D/SceneSetup"
import { useDesignStore } from "@/lib/editor/state/store"
import { generateTextureFromLayers } from "@/lib/editor/services/texture-generator"
import { Stage, Environment, ContactShadows, OrbitControls } from "@react-three/drei"
import * as THREE from "three"

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

export function DesignCanvas3D({ productType }: DesignCanvas3DProps) {
  const model = useDesignStore((s) => s.model)
  const layers = useDesignStore((s) => s.layers)
  const canvas = useDesignStore((s) => s.canvas)
  const boxOpenState = useDesignStore((s) => s.ui.boxOpenState)

  const [faceTextures, setFaceTextures] = useState<Record<string, string>>({})

  // Generate textures for each face
  useEffect(() => {
    let active = true
    const updateTextures = async () => {
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
      }
    }
    updateTextures()
    return () => {
      active = false
    }
  }, [layers, model, canvas.backgroundColor])

  const type = model.type.replace(/_/g, "-")
  const BoxModel = getBoxModel(type)

  // Calculate box center for camera target
  const boxCenterY = (model.dimensions.height / 100) / 2

  return (
    <div className="w-full h-full" style={{ background: "#f8f8f8" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [2.2, 1.8, 2.2], fov: 38 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        {/* خلفية رمادية فاتحة */}
        <color attach="background" args={["#f8f8f8"]} />

        {/* إضاءة واقعية للكرتون */}
        <ambientLight intensity={0.5} />

        {/* إضاءة رئيسية (key light) */}
        <directionalLight
          position={[5, 8, 6]}
          intensity={1.5}
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
        <directionalLight position={[-4, 5, -4]} intensity={0.5} />

        {/* إضاءة خلفية (rim light) */}
        <directionalLight position={[0, 3, -6]} intensity={0.35} />

        {/* إضاءة نصف كروية للمحيط */}
        <hemisphereLight intensity={0.4} groundColor="#9A8060" color="#ffffff" />

        {/* بيئة للانعكاسات */}
        <Environment preset="studio" background={false} />

        {/* ظل ناعم على الأرض */}
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.45}
          scale={8}
          blur={2.5}
          far={3}
          color="#5a4a3a"
        />

        {/* أرضية شفافة للظلال */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.01, 0]}
          receiveShadow
        >
          <planeGeometry args={[15, 15]} />
          <shadowMaterial transparent opacity={0.12} />
        </mesh>

        {/* نموذج الصندوق */}
        <Suspense fallback={<LoadingBox />}>
          <group position={[0, 0, 0]}>
            <BoxModel
              dimensions={model.dimensions}
              type={type}
              material={model.material}
              printCoverage={model.printCoverage}
              textures={faceTextures}
              backgroundColor={canvas.backgroundColor}
              openState={boxOpenState}
            />
          </group>
        </Suspense>

        {/* تحكم الكاميرا */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.8}
          maxDistance={8}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={false}
          target={[0, boxCenterY, 0]}
        />
      </Canvas>
    </div>
  )
}
