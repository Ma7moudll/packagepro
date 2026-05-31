# 3D Features Services

This directory contains services for advanced 3D features in the PackagePro editor.

## Services

### 1. Model Loader (`model-loader.ts`)
- **Purpose**: Load and preload 3D models (GLTF/GLB)
- **Features**:
  - GLTF/GLB loading with Draco compression support
  - Model preloading for better performance
  - Integration with @react-three/gltfjsx for optimized components

### 2. Raycasting (`raycasting.ts`)
- **Purpose**: Optimized raycasting using BVH (Bounding Volume Hierarchy)
- **Features**:
  - Setup BVH for meshes and scenes
  - Optimized intersection detection
  - Significantly improves performance for complex meshes

## Components

### 1. PostProcessingEffects (`components/editor/effects/PostProcessingEffects.tsx`)
- **Purpose**: Visual effects for 3D scenes
- **Features**:
  - Bloom effect
  - Chromatic aberration
  - Vignette
  - Noise
  - Depth of field (optional)

### 2. PhysicsWorld (`components/editor/3D/PhysicsWorld.tsx`)
- **Purpose**: Physics simulation for 3D objects
- **Features**:
  - Gravity simulation
  - Collision detection
  - Rigid body physics
  - Ground plane

### 3. GLTFModel (`components/editor/models/GLTFModel.tsx`)
- **Purpose**: Load and display GLTF/GLB models
- **Features**:
  - Automatic BVH setup
  - Auto-rotation support
  - Model preloading

## Usage Examples

### Loading a GLTF Model

```tsx
import { GLTFModel } from "@/components/editor/models/GLTFModel"

<GLTFModel 
  url="/models/custom-box.glb" 
  position={[0, 0, 0]}
  autoRotate={true}
/>
```

### Using gltfjsx CLI

For optimized, typed components:

```bash
npx gltfjsx model.glb
```

This generates a component like:

```tsx
import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export function Model(props) {
  const { nodes, materials } = useGLTF('/model.glb')
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.box.geometry} material={materials.material} />
    </group>
  )
}
```

### Enabling Physics

```tsx
import { PhysicsWorld } from "@/components/editor/3D/PhysicsWorld"

<PhysicsWorld enabled={true} gravity={[0, -9.81, 0]}>
  {/* Your 3D objects */}
</PhysicsWorld>
```

### Using BVH for Raycasting

```tsx
import { setupBVHForMesh, findClosestIntersection } from "@/lib/editor/services/raycasting"

// Setup BVH for a mesh
setupBVHForMesh(meshRef.current)

// Find closest intersection
const intersection = findClosestIntersection(scene, raycaster, mouse, camera)
```

## Dependencies

- `@react-three/postprocessing@^2.15.0` - Post-processing effects
- `@react-three/gltfjsx` - GLTF to React component generator
- `@react-three/cannon@^2.6.0` - Physics simulation
- `three-mesh-bvh@^0.8.0` - BVH for optimized raycasting

## Notes

- Post-processing effects can be expensive. Use sparingly.
- Physics simulation is disabled by default. Enable only when needed.
- BVH setup should be done once per mesh, typically in useEffect.
- gltfjsx generates optimized components but requires CLI usage.

