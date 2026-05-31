"use client"

import * as THREE from "three"
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh"

/**
 * Setup BVH (Bounding Volume Hierarchy) for optimized raycasting
 * This significantly improves performance for complex meshes
 */
export function setupBVHForMesh(mesh: THREE.Mesh) {
  // Extend geometry with BVH
  if (mesh.geometry) {
    mesh.geometry.computeBoundsTree = computeBoundsTree
    mesh.geometry.disposeBoundsTree = disposeBoundsTree
    mesh.geometry.computeBoundsTree()

    // Extend mesh with accelerated raycast
    mesh.raycast = acceleratedRaycast
  }
}

/**
 * Setup BVH for entire scene
 */
export function setupBVHForScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      setupBVHForMesh(object)
    }
  })
}

/**
 * Perform optimized raycast on scene
 */
export function raycastScene(
  scene: THREE.Scene,
  raycaster: THREE.Raycaster,
  mouse: THREE.Vector2,
  camera: THREE.Camera
): THREE.Intersection[] {
  raycaster.setFromCamera(mouse, camera)
  return raycaster.intersectObject(scene, true)
}

/**
 * Find closest intersection with BVH optimization
 */
export function findClosestIntersection(
  scene: THREE.Scene,
  raycaster: THREE.Raycaster,
  mouse: THREE.Vector2,
  camera: THREE.Camera
): THREE.Intersection | null {
  const intersections = raycastScene(scene, raycaster, mouse, camera)
  return intersections.length > 0 ? intersections[0] : null
}

/**
 * Setup BVH for React Three Fiber mesh ref
 */
export function useBVH(meshRef: React.RefObject<THREE.Mesh>) {
  if (meshRef.current) {
    setupBVHForMesh(meshRef.current)
  }
}

