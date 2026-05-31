"use client"

export interface BoxDimensions {
  width: number
  height: number
  depth: number
  unit: "mm" | "cm" | "inch"
}

export interface BoxConstraints {
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  minDepth: number
  maxDepth: number
  aspectRatio?: {
    width: number
    height: number
  }
}

export interface MaterialProperties {
  thickness: number
  density: number
  stiffness: number
  color: string
  texture?: string
}

export interface BoxFace {
  id: string
  type: "front" | "back" | "left" | "right" | "top" | "bottom"
  width: number
  height: number
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  flaps?: BoxFlap[]
}

export interface BoxFlap {
  id: string
  type: "top" | "bottom" | "left" | "right"
  width: number
  height: number
  position: { x: number; y: number; z: number }
}

export interface BoxStructure {
  id: string
  name: string
  type: "regular" | "tray" | "sleeve" | "custom"
  dimensions: BoxDimensions
  material: MaterialProperties
  faces: BoxFace[]
  flaps: BoxFlap[]
  glueTabs?: GlueTab[]
  scoreLines?: ScoreLine[]
}

export interface GlueTab {
  id: string
  faceId: string
  width: number
  height: number
  position: { x: number; y: number; z: number }
}

export interface ScoreLine {
  id: string
  type: "fold" | "cut" | "perforation"
  start: { x: number; y: number; z: number }
  end: { x: number; y: number; z: number }
  depth: number
}

export interface StructuralValidation {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  strength: number
  stability: number
}

export interface ValidationError {
  type: "dimension" | "material" | "structure" | "flap" | "glue"
  message: string
  severity: "critical" | "high" | "medium" | "low"
  location?: { x: number; y: number; z: number }
}

export interface ValidationWarning {
  type: "dimension" | "material" | "structure" | "flap" | "glue"
  message: string
  suggestion?: string
}

export interface FoldingState {
  isFolded: boolean
  progress: number // 0-1
  faces: Array<{
    id: string
    rotation: { x: number; y: number; z: number }
    position: { x: number; y: number; z: number }
  }>
}

