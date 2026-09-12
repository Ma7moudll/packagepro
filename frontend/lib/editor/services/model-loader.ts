"use client"

import { useGLTF } from "@react-three/drei"

export interface ModelInfo {
  url: string
  type: "gltf" | "glb" | "obj" | "fbx"
  name: string
  preview?: string
}

/**
 * Preload 3D model for better performance
 */
export function usePreloadedModel(url: string) {
  return useGLTF(url)
}

/**
 * Load GLTF/GLB model with Draco compression support
 */
export async function loadModel(url: string): Promise<any> {
  // @ts-ignore - three.js addon loader types not always resolved
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js")
  // @ts-ignore - three.js addon loader types not always resolved
  const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js")

  const loader = new GLTFLoader()

  // Setup Draco loader for compressed models
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/")
  loader.setDRACOLoader(dracoLoader)

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf: any) => resolve(gltf),
      (progress: any) => {
        // Progress callback
        console.log("Loading model:", (progress.loaded / progress.total) * 100 + "%")
      },
      (error: any) => reject(error)
    )
  })
}

/**
 * Convert GLTF to React Three Fiber component using gltfjsx
 * This would typically be done via CLI: npx gltfjsx model.glb
 * But we can also generate it programmatically
 */
export function generateGLTFJSX(gltf: any, componentName: string = "Model"): string {
  const nodes = Object.keys(gltf.scene.children).map((key) => {
    const child = gltf.scene.children[key]
    return `  ${key}: THREE.Mesh`
  })

  return `
import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export function ${componentName}(props) {
  const { nodes, materials } = useGLTF('/path/to/model.glb')
  const group = useRef()
  
  return (
    <group ref={group} {...props} dispose={null}>
      {/* Generated nodes */}
    </group>
  )
}

useGLTF.preload('/path/to/model.glb')
`
}

