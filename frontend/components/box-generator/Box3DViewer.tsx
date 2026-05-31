"use client"

import { useRef, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { BoxStructure } from "@/lib/box-generator/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/providers/language-provider"
import * as THREE from "three"

interface Box3DViewerProps {
  structure: BoxStructure
}

function BoxFaceMesh({ face, material }: { face: any; material: any }) {
  const meshRef = useRef<THREE.Mesh>(null)

  return (
    <mesh
      ref={meshRef}
      position={[face.position.x, face.position.y, face.position.z]}
      rotation={[face.rotation.x, face.rotation.y, face.rotation.z]}
    >
      <boxGeometry args={[face.width, face.height, material.thickness]} />
      <meshStandardMaterial
        color={material.color}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  )
}

function BoxScene({ structure }: { structure: BoxStructure }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {structure.faces.map((face) => (
        <BoxFaceMesh key={face.id} face={face} material={structure.material} />
      ))}

      {structure.flaps.map((flap) => (
        <mesh
          key={flap.id}
          position={[flap.position.x, flap.position.y, flap.position.z]}
        >
          <boxGeometry args={[flap.width, flap.height, structure.material.thickness]} />
          <meshStandardMaterial
            color={structure.material.color}
            opacity={0.8}
            transparent
          />
        </mesh>
      ))}

      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  )
}

export function Box3DViewer({ structure }: Box3DViewerProps) {
  const { language } = useLanguage()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === "ar" ? "معاينة ثلاثية الأبعاد" : "3D Preview"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-96 bg-slate-100 rounded-lg overflow-hidden">
          <Canvas>
            <PerspectiveCamera makeDefault position={[300, 300, 300]} />
            <BoxScene structure={structure} />
          </Canvas>
        </div>
      </CardContent>
    </Card>
  )
}

