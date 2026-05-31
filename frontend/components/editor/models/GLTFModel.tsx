"use client"

import { useRef } from "react"
import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { setupBVHForMesh } from "@/lib/editor/services/raycasting"

interface GLTFModelProps {
  url: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  autoRotate?: boolean
}

/**
 * Generic GLTF model loader component
 * Usage: <GLTFModel url="/models/box.glb" />
 * 
 * For optimized models, use gltfjsx CLI:
 * npx gltfjsx model.glb
 * This generates a typed component with proper mesh/material references
 */
export function GLTFModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  autoRotate = false,
}: GLTFModelProps) {
  const { scene } = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null)

  // Setup BVH for raycasting optimization
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      setupBVHForMesh(child)
    }
  })

  // Auto-rotate animation
  useFrame((state, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5
    }
  })

  const scaleArray = Array.isArray(scale) ? scale : [scale, scale, scale]

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scaleArray}>
      <primitive object={scene} />
    </group>
  )
}

// Note: To preload models, use useGLTF.preload(url) in a parent component
// Example: useGLTF.preload('/models/box.glb')

