"use client"

import { useRef } from "react"
import { useThree } from "@react-three/fiber"
import { PerspectiveCamera, OrbitControls, Environment, ContactShadows } from "@react-three/drei"
import * as THREE from "three"

interface SceneSetupProps {
  showGrid?: boolean
  showHelpers?: boolean
  environment?: "sunset" | "dawn" | "night" | "warehouse" | "forest" | "apartment" | "studio" | "city"
  background?: string
}

export function SceneSetup({
  showGrid = true,
  showHelpers = false,
  environment = "studio",
  background,
}: SceneSetupProps) {
  const { scene } = useThree()

  // Set background color if provided (default to white)
  const bgColor = background || "#ffffff"
  scene.background = new THREE.Color(bgColor)

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-10, 10, 5]} intensity={0.5} color="#ffffff" />
      <pointLight position={[0, 10, 0]} intensity={0.3} />

      <PerspectiveCamera
        makeDefault
        position={[4, 4, 4]}
        fov={45}
        near={0.1}
        far={1000}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={15}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 1.7}
        enableDamping={true}
        dampingFactor={0.05}
        keyPanSpeed={7.0}
      />

      <Environment preset={environment} />

      <ContactShadows
        position={[0, -1, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={1.5}
      />

      {showGrid && (
        <gridHelper
          args={[20, 20, "#94a3b8", "#cbd5e1"]}
          position={[0, -0.999, 0]}
        />
      )}

      {showHelpers && <axesHelper args={[5]} />}
    </>
  )
}

export function useCameraControl() {
  const { camera } = useThree()

  const resetCamera = () => {
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)
  }

  const focusOn = (x: number, y: number, z: number) => {
    camera.position.set(x + 5, y + 5, z + 5)
    camera.lookAt(x, y, z)
  }

  return { resetCamera, focusOn }
}
