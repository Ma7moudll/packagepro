"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, Text as DreiText } from "@react-three/drei"
import { fabric } from "fabric"
import { Button } from "@/components/ui/button"
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize2,
  Minimize2,
  Grid,
  Layers,
} from "lucide-react"
import * as THREE from "three"

interface AdvancedDesignEditorProps {
  productType?: "box" | "bag" | "cup" | "tube"
  viewMode?: "2d" | "3d"
  initialDesign?: {
    elements?: any[]
    colors?: { primary: string; secondary: string }
    dimensions?: { length: number; width: number; height: number }
  }
  onSave?: (design: any) => void
}

// 3D Box with texture support
function Box3D({
  dimensions,
  texture,
  elements,
}: {
  dimensions: { length: number; width: number; height: number }
  texture?: string
  elements?: any[]
}) {
  const boxRef = useRef<THREE.Mesh>(null)
  const textureLoader = new THREE.TextureLoader()

  useFrame(() => {
    if (boxRef.current) {
      boxRef.current.rotation.y += 0.002
    }
  })

  const length = dimensions.length / 100
  const width = dimensions.width / 100
  const height = dimensions.height / 100

  let material: THREE.MeshStandardMaterial

  if (texture) {
    const map = textureLoader.load(texture)
    material = new THREE.MeshStandardMaterial({ map, metalness: 0.3, roughness: 0.4 })
  } else {
    material = new THREE.MeshStandardMaterial({ color: "#d2b48c", metalness: 0.3, roughness: 0.4 })
  }

  return (
    <group>
      <mesh ref={boxRef} castShadow receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <primitive object={material} attach="material" />
      </mesh>
      {elements?.map((el, idx) => {
        if (el.type === "text") {
          return (
            <DreiText
              key={idx}
              position={[(el.x || 0) / 100, (el.y || 0) / 100, width / 2 + 0.01]}
              fontSize={0.1}
              color={el.color || "black"}
              anchorX="center"
              anchorY="middle"
            >
              {el.content || ""}
            </DreiText>
          )
        }
        return null
      })}
    </group>
  )
}

export function AdvancedDesignEditor({
  productType = "box",
  viewMode = "3d",
  initialDesign,
  onSave,
}: AdvancedDesignEditorProps) {
  const canvas2DRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [dimensions, setDimensions] = useState(
    initialDesign?.dimensions || { length: 200, width: 150, height: 100 }
  )
  const [colors, setColors] = useState({
    primary: initialDesign?.colors?.primary || "#d2b48c",
    secondary: initialDesign?.colors?.secondary || "#1f2937",
  })
  const [elements, setElements] = useState<any[]>(initialDesign?.elements || [])
  const [selectedElement, setSelectedElement] = useState<any>(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)

  // Initialize Fabric.js canvas for 2D editing
  useEffect(() => {
    if (viewMode === "2d" && canvas2DRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvas2DRef.current, {
        width: 800,
        height: 600,
        backgroundColor: "#ffffff",
      })

      fabricCanvasRef.current = canvas

      // Handle selection
      canvas.on("selection:created", (e) => {
        if (e.selected && e.selected[0]) {
          setSelectedElement(e.selected[0])
        }
      })

      canvas.on("selection:updated", (e) => {
        if (e.selected && e.selected[0]) {
          setSelectedElement(e.selected[0])
        }
      })

      canvas.on("selection:cleared", () => {
        setSelectedElement(null)
      })

      // Sync elements
      canvas.on("object:added", () => {
        syncElementsFromCanvas()
      })

      canvas.on("object:removed", () => {
        syncElementsFromCanvas()
      })

      canvas.on("object:modified", () => {
        syncElementsFromCanvas()
      })

      // Add existing elements
      elements.forEach((el) => {
        if (el.type === "text") {
          const text = new fabric.Text(el.content || "Text", {
            left: el.x || 100,
            top: el.y || 100,
            fontSize: el.fontSize || 40,
            fill: el.color || "#000000",
            fontFamily: el.fontFamily || "Arial",
          })
          canvas.add(text)
        } else if (el.type === "image" && el.src) {
          fabric.Image.fromURL(el.src, (img) => {
            img.set({
              left: el.x || 100,
              top: el.y || 100,
              scaleX: el.scaleX || 1,
              scaleY: el.scaleY || 1,
            })
            canvas.add(img)
          })
        }
      })

      return () => {
        canvas.dispose()
        fabricCanvasRef.current = null
      }
    }
  }, [viewMode])

  const syncElementsFromCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const objects = fabricCanvasRef.current.getObjects()
    const newElements = objects.map((obj) => {
      if (obj instanceof fabric.Text) {
        return {
          type: "text",
          content: obj.text,
          x: obj.left || 0,
          y: obj.top || 0,
          fontSize: obj.fontSize || 40,
          color: obj.fill?.toString() || "#000000",
          fontFamily: obj.fontFamily || "Arial",
        }
      } else if (obj instanceof fabric.Image) {
        return {
          type: "image",
          src: obj.getSrc(),
          x: obj.left || 0,
          y: obj.top || 0,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
        }
      }
      return null
    }).filter(Boolean)

    setElements(newElements as any[])
  }, [])

  const addTextElement = () => {
    if (fabricCanvasRef.current) {
      const text = new fabric.Text("اضغط للتعديل", {
        left: 200,
        top: 200,
        fontSize: 40,
        fill: "#000000",
        fontFamily: "Arial",
      })
      fabricCanvasRef.current.add(text)
      fabricCanvasRef.current.setActiveObject(text)
      syncElementsFromCanvas()
    }
  }

  const addImageElement = (file: File) => {
    if (fabricCanvasRef.current) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        fabric.Image.fromURL(dataUrl, (img) => {
          img.set({
            left: 200,
            top: 200,
            scaleX: 0.5,
            scaleY: 0.5,
          })
          fabricCanvasRef.current?.add(img)
          syncElementsFromCanvas()
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.5, Math.min(2, canvasZoom + delta))
    setCanvasZoom(newZoom)
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(newZoom)
    }
  }

  const resetCamera = () => {
    setCanvasZoom(1)
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(1)
      fabricCanvasRef.current.viewportTransform = [1, 0, 0, 1, 0, 0]
    }
  }

  const exportDesign = () => {
    if (fabricCanvasRef.current) {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 2,
      })
      const link = document.createElement("a")
      link.download = "design.png"
      link.href = dataURL
      link.click()
    }
  }

  if (viewMode === "2d") {
    return (
      <div className="relative w-full h-full flex flex-col bg-white">
        {/* 2D Canvas Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg border p-2">
            <Button size="sm" variant="outline" onClick={() => handleZoom(0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleZoom(-0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={resetCamera}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={showGrid ? "default" : "outline"}
              onClick={() => setShowGrid(!showGrid)}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={exportDesign}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 2D Canvas */}
        <div className="flex-1 flex items-center justify-center bg-slate-50 overflow-auto p-8">
          <div
            className="relative"
            style={{
              transform: `scale(${canvasZoom})`,
              transformOrigin: "center",
            }}
          >
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #94a3b8 1px, transparent 1px),
                    linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
                  `,
                  backgroundSize: "20px 20px",
                }}
              />
            )}
            <canvas ref={canvas2DRef} className="shadow-xl border border-slate-300" />
          </div>
        </div>
      </div>
    )
  }

  // 3D View
  return (
    <div className="relative w-full h-full">
      {/* 3D Preview Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg border p-2">
        <Button size="sm" variant="outline">
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={exportDesign}>
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* 3D Canvas */}
      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200">
        <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <PerspectiveCamera makeDefault position={[5, 5, 5]} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          <Environment preset="studio" />
          {productType === "box" && (
            <Box3D dimensions={dimensions} texture={undefined} elements={elements} />
          )}
          <mesh receiveShadow position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[10, 10]} />
            <meshStandardMaterial color="#f0f0f0" />
          </mesh>
        </Canvas>
      </div>
    </div>
  )
}

