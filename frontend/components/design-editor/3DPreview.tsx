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
  lifecycleStatus?: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "IN_PRODUCTION"
}

export function Preview3D({ 
  productType = "box", 
  dimensions, 
  color, 
  logo, 
  text,
  lifecycleStatus = "DRAFT"
}: Preview3DProps) {
  // Determine if preview should be grayed out
  const isNonEditableState = lifecycleStatus && lifecycleStatus !== "DRAFT" && lifecycleStatus !== "APPROVED"
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden relative">
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
      
      {/* Lifecycle status overlay */}
      {isNonEditableState && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
          <div className="bg-white/90 px-6 py-4 rounded-lg shadow-lg text-center">
            <p className="text-sm font-semibold text-gray-700">Preview Only</p>
            <p className="text-xs text-gray-600 mt-1">
              Status: <span className="font-medium capitalize">{lifecycleStatus?.replace(/_/g, " ")}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

