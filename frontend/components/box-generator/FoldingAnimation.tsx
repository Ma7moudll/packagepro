"use client"

import { useState } from "react"
import { FoldingAnimationController } from "@/lib/box-generator/folding-animation"
import { BoxStructure } from "@/lib/box-generator/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, RotateCcw } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three"

interface FoldingAnimationProps {
  structure: BoxStructure
}

function AnimatedBoxScene({
  structure,
  foldingState,
}: {
  structure: BoxStructure
  foldingState: any
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {foldingState.faces.map((faceState: any) => {
        const originalFace = structure.faces.find((f) => f.id === faceState.id)
        if (!originalFace) return null

        return (
          <mesh
            key={faceState.id}
            position={[faceState.position.x, faceState.position.y, faceState.position.z]}
            rotation={[faceState.rotation.x, faceState.rotation.y, faceState.rotation.z]}
          >
            <boxGeometry
              args={[originalFace.width, originalFace.height, structure.material.thickness]}
            />
            <meshStandardMaterial
              color={structure.material.color}
              roughness={0.7}
            />
          </mesh>
        )
      })}

      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  )
}

export function FoldingAnimation({ structure }: FoldingAnimationProps) {
  const { language } = useLanguage()
  const controller = new FoldingAnimationController()
  const [foldingState, setFoldingState] = useState(
    controller.calculateFoldedState(structure)
  )
  const [isAnimating, setIsAnimating] = useState(false)
  const [progress, setProgress] = useState(1)

  const handleFold = async () => {
    setIsAnimating(true)
    await controller.animateFolding(
      structure,
      true,
      (state) => {
        setFoldingState(state)
        setProgress(state.progress)
      }
    )
    setIsAnimating(false)
  }

  const handleUnfold = async () => {
    setIsAnimating(true)
    await controller.animateFolding(
      structure,
      false,
      (state) => {
        setFoldingState(state)
        setProgress(state.progress)
      }
    )
    setIsAnimating(false)
  }

  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0]
    setProgress(newProgress)

    const unfolded = controller.calculateUnfoldedState(structure)
    const folded = controller.calculateFoldedState(structure)
    const interpolated = controller.interpolateState(
      unfolded,
      folded,
      newProgress
    )
    setFoldingState(interpolated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === "ar" ? "رسوم متحركة للطي/الفتح" : "Folding/Unfolding Animation"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full h-96 bg-slate-100 rounded-lg overflow-hidden">
          <Canvas>
            <PerspectiveCamera makeDefault position={[400, 400, 400]} />
            <AnimatedBoxScene structure={structure} foldingState={foldingState} />
          </Canvas>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              {language === "ar" ? "التقدم" : "Progress"}: {Math.round(progress * 100)}%
            </label>
            <Slider
              value={[progress]}
              onValueChange={handleProgressChange}
              min={0}
              max={1}
              step={0.01}
              disabled={isAnimating}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleFold}
              disabled={isAnimating || progress >= 1}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              {language === "ar" ? "طي" : "Fold"}
            </Button>
            <Button
              onClick={handleUnfold}
              disabled={isAnimating || progress <= 0}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {language === "ar" ? "فتح" : "Unfold"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

