"use client"

import { Physics, RigidBody, CuboidCollider } from "@react-three/cannon"
import { useDesignStore } from "@/lib/editor/state/store"

interface PhysicsWorldProps {
  children: React.ReactNode
  enabled?: boolean
  gravity?: [number, number, number]
}

/**
 * Physics world wrapper using @react-three/cannon
 * Provides physics simulation for 3D objects
 */
export function PhysicsWorld({
  children,
  enabled = false,
  gravity = [0, -9.81, 0],
}: PhysicsWorldProps) {
  if (!enabled) {
    return <>{children}</>
  }

  return (
    <Physics gravity={gravity} defaultContactMaterial={{ friction: 0.4, restitution: 0.3 }}>
      {/* Ground plane - temporarily commented out due to API changes */}
      {/* <RigidBody type="fixed" position={[0, -1, 0]}>
        <CuboidCollider args={[20, 0.1, 20]} />
        <mesh receiveShadow>
          <boxGeometry args={[20, 0.1, 20]} />
          <meshStandardMaterial color="#f0f0f0" />
        </mesh>
      </RigidBody> */}

      {/* Render children with physics */}
      {children}

      {/* Example: Physics-enabled box */}
      {/* <RigidBody mass={1} position={[0, 5, 0]}>
        <CuboidCollider args={[0.5, 0.5, 0.5]}>
          <mesh castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        </CuboidCollider>
      </RigidBody> */}
    </Physics>
  )
}

