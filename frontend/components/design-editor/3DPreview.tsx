"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei"
import * as THREE from "three"
import { useRef } from "react"

interface Box3DProps {
  dimensions: { length: number; width: number; height: number }
  color: string
  logo?: string
  text?: string
}

function Box3D({ dimensions, color, logo, text }: Box3DProps) {
  const boxRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (boxRef.current) {
      // Subtle rotation animation
      boxRef.current.rotation.y += 0.005
    }
  })

  const length = dimensions.length / 100
  const width = dimensions.width / 100
  const height = dimensions.height / 100

  return (
    <group>
      <mesh ref={boxRef} castShadow receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  )
}

interface Preview3DProps {
  productType?: "box" | "bag" | "cup" | "tube"
  dimensions: { length: number; width: number; height: number }
  color: string
  logo?: string
  text?: string
}

export function Preview3D({ productType = "box", dimensions, color, logo, text }: Preview3DProps) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden">
      <Canvas shadows>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <PerspectiveCamera makeDefault position={[3, 3, 3]} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <Environment preset="studio" />
        {productType === "box" && <Box3D dimensions={dimensions} color={color} logo={logo} text={text} />}
        <mesh receiveShadow position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#f0f0f0" />
        </mesh>
      </Canvas>
    </div>
  )
}

