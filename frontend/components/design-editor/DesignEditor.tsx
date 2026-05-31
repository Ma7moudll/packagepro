"use client"

import { useState, useRef, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Download, RotateCw, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import * as THREE from "three"

interface DesignEditorProps {
  productType?: "box" | "bag" | "cup" | "tube"
  initialDesign?: {
    colors?: { primary: string; secondary: string }
    logo?: string
    text?: string
    dimensions?: { length: number; width: number; height: number }
  }
  onSave?: (design: any) => void
}

// 3D Box Component
function Box3D({ dimensions, color, logo, text }: {
  dimensions: { length: number; width: number; height: number }
  color: string
  logo?: string
  text?: string
}) {
  const boxRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (boxRef.current) {
      // Subtle animation
      boxRef.current.rotation.y += 0.002
    }
  })

  const length = dimensions.length / 100
  const width = dimensions.width / 100
  const height = dimensions.height / 100

  return (
    <group>
      <mesh ref={boxRef} castShadow receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Text rendering will be added later with proper font configuration */}
    </group>
  )
}

// Main Design Editor Component
export function DesignEditor({ productType = "box", initialDesign, onSave }: DesignEditorProps) {
  const [colors, setColors] = useState({
    primary: initialDesign?.colors?.primary || "#d2b48c",
    secondary: initialDesign?.colors?.secondary || "#1f2937",
  })
  const [dimensions, setDimensions] = useState(
    initialDesign?.dimensions || { length: 200, width: 150, height: 100 }
  )
  const [logo, setLogo] = useState<string | null>(initialDesign?.logo || null)
  const [text, setText] = useState(initialDesign?.text || "")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogo(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    if (onSave) {
      onSave({
        colors,
        dimensions,
        logo,
        text,
      })
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* 3D Preview */}
      <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden" style={{ height: "500px" }}>
        <Canvas shadows>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <PerspectiveCamera makeDefault position={[5, 5, 5]} />
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          {productType === "box" && (
            <Box3D dimensions={dimensions} color={colors.primary} logo={logo || undefined} text={text || undefined} />
          )}
        </Canvas>
        <div className="absolute top-4 right-4 flex gap-2">
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
        </div>
      </div>

      {/* Design Controls */}
      <div className="space-y-6">
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="logo">Logo</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="dimensions">Size</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  id="primary-color"
                  value={colors.primary}
                  onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={colors.primary}
                  onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  id="secondary-color"
                  value={colors.secondary}
                  onChange={(e) => setColors({ ...colors, secondary: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={colors.secondary}
                  onChange={(e) => setColors({ ...colors, secondary: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logo" className="space-y-4">
            <div>
              <Label htmlFor="logo-upload">Upload Logo</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center mt-2">
                <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <Input
                  type="file"
                  id="logo-upload"
                  accept="image/*,.ai,.eps,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  className="mt-4"
                >
                  Choose File
                </Button>
                {uploadedFile && <p className="mt-2 text-sm text-emerald-600">{uploadedFile.name}</p>}
                {logo && (
                  <img src={logo} alt="Logo preview" className="mt-4 max-h-32 mx-auto rounded" />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div>
              <Label htmlFor="custom-text">Custom Text</Label>
              <Input
                id="custom-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text for your packaging"
                className="mt-2"
              />
            </div>
          </TabsContent>

          <TabsContent value="dimensions" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="length">Length (mm)</Label>
                <Input
                  id="length"
                  type="number"
                  value={dimensions.length}
                  onChange={(e) => setDimensions({ ...dimensions, length: Number(e.target.value) })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="width">Width (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  value={dimensions.width}
                  onChange={(e) => setDimensions({ ...dimensions, width: Number(e.target.value) })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="height">Height (mm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={dimensions.height}
                  onChange={(e) => setDimensions({ ...dimensions, height: Number(e.target.value) })}
                  className="mt-2"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-4">
          <Button onClick={handleSave} className="flex-1">
            Save Design
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}

