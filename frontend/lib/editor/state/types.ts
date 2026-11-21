"use client"

import type { DielineBlueprint } from "../../../../shared/types/index.ts"

export type ToolType = "select" | "text" | "shape" | "draw" | "upload"

export type DesignLifecycleStatus = 
  | "DRAFT" 
  | "SUBMITTED" 
  | "IN_REVIEW" 
  | "APPROVED" 
  | "REJECTED" 
  | "IN_PRODUCTION"

export type FaceId =
  | "front" | "back" | "left" | "right" | "top" | "bottom"
  | "inside_front" | "inside_back" | "inside_left" | "inside_right" | "inside_top" | "inside_bottom"

export interface CanvasState {
  width: number
  height: number
  backgroundColor: string
  backgroundImage?: string
}

export interface ModelDimensions {
  length: number
  width: number
  height: number
}

export interface Face {
  id: FaceId
  name: string
  width?: number
  height?: number
  depth?: number
}

/** M7: Required-zone descriptor carried from the backend ProductStructure. */
export interface FaceZone {
  label: string
  required: boolean
  position: [number, number, number]
  rotation?: [number, number, number]
}

export type LayerType = "text" | "image" | "shape" | "group"

export interface BaseLayer {
  id: string
  type: LayerType
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: GlobalCompositeOperation | "normal"
  position: { x: number; y: number }
  rotation: number
  scale: { x: number; y: number }
  faceId: FaceId
  raisedPrint?: { text: string; method: "unspecified" }
}

export interface TextShadow {
  offsetX: number
  offsetY: number
  blur: number
  color: string
}

export interface TextStroke {
  width: number
  color: string
}

export interface TextProperties {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  letterSpacing: number
  align: "left" | "center" | "right" | "justify"
  color: string
  shadow?: TextShadow
  stroke?: TextStroke
  curveRadius?: number
}

export interface ImageFilterConfig {
  brightness: number
  contrast: number
  saturation: number
  blur: number
  grayscale: number
  sepia: number
  hueRotate: number
  invert: number
}

export const DEFAULT_IMAGE_FILTERS: ImageFilterConfig = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  invert: 0,
}

export interface ImageProperties {
  src: string
  naturalWidth?: number
  naturalHeight?: number
  filters?: ImageFilterConfig
}

export interface ShapeProperties {
  shape: "rect" | "circle" | "triangle" | "star" | "polygon" | "line" | "path"
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius?: number
}

export interface Layer extends BaseLayer {
  textProperties?: TextProperties
  imageProperties?: ImageProperties
  shapeProperties?: ShapeProperties
}

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  zoom: number
}

export interface UIState {
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  gridVisible: boolean
  guidesVisible: boolean
  selectedFace: FaceId
  viewMode: "2d" | "3d" | "dieline" | "wall"
  boxOpenState: number // 0 = closed, 1 = fully open
}

// Product type categories
export type BoxType = 
  | "mailer_box" | "ecommerce_mailer_box" | "shipping_box" | "rigid_box" | "gift_box" 
  | "folding_carton" | "pizza_box" | "pillow_box" | "snap_lock_box" | "auto_bottom_box"
  | "christmas_gift_box" | "wine_box" | "bottle_box" | "sleeve"

export type BagType = 
  | "paper_bag" | "cotton_bag" | "mesh_bag" | "muslin_bag" | "paper_mailer_bag" 
  | "poly_mailer_bag" | "bio_poly_mailer_bag" | "frosted_ziplock_bag"

export type PouchType = 
  | "stand_up_pouch" | "doypack_pouch" | "compostable_doypack" | "recyclable_doypack" 
  | "doypack_valve"

export type RigidBoxType = 
  | "rigid_magnetic_box" | "rigid_box_lid" | "rigid_jewellery_box" 
  | "rigid_cosmetic_box" | "rigid_magnetic_cosmetic_box" | "rigid_wine_box" 
  | "rigid_magnetic_wine_box" | "rigid_flower_box" | "rigid_shirt_box" 
  | "rigid_gift_box" | "rigid_magnetic_gift_box"

export type ContainerType = 
  | "cup" | "smoothie_cup" | "tube" | "tube_metal_lid"

export type FlatType = 
  | "envelope" | "corrugated_envelope" | "tissue_paper" | "packing_paper" 
  | "paper_tape" | "plastic_tape" | "water_activated_tape"

export type LabelType = 
  | "rectangle_label" | "circle_label" | "square_label" | "labels_sheet"

export type CardType = 
  | "business_card" | "loyalty_card" | "thank_you_card" | "menu_card"

export type AccessoryType = 
  | "ribbon" | "stamp_ink_pad"

export type ProductType = 
  | BoxType | BagType | PouchType | RigidBoxType | ContainerType 
  | FlatType | LabelType | CardType | AccessoryType

// Product category for filtering
export type ProductCategory = 
  | "all" | "boxes" | "mailing_bags" | "pouches" | "bags" 
  | "envelopes" | "food_packaging" | "accessories" | "labels" | "cards"

export const PRODUCT_CATEGORY_TO_TEMPLATE: Record<ProductCategory, string[]> = {
  all: [],
  boxes: ["box"],
  mailing_bags: ["pouch"],
  bags: ["bag"],
  pouches: ["pouch"],
  envelopes: ["other"],
  food_packaging: ["box", "pouch"],
  labels: ["label"],
  cards: ["other"],
  accessories: ["other"],
}

// Size presets
export interface SizePreset {
  id: string
  name: string
  dimensions: ModelDimensions
}

// Color variant
export type ColorVariant = 
  | "one_colour" | "white" | "multicolour_muted" | "multicolour_saturated" | "multicolour_premium"

export interface ModelState {
  type: ProductType
  category: ProductCategory
  dimensions: ModelDimensions
  material: string
  boardSpecification?: import("../material-specification").BoardSpecification
  faces: Face[]
  printCoverage: "outside" | "inside" | "both"
  adhesiveStrip: "none" | "single" | "double"
  finishing: "none" | "matte" | "glossy" | "spot_uv"
  lamination: "none" | "soft-touch" | "anti-scratch"
  fluteType?: "E" | "B" | "EB"
  colorVariant: ColorVariant
  sizePreset?: string
  quantity: number
}

export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export interface DesignCoreState {
  canvas: CanvasState
  model: ModelState
  layers: Layer[]
  selectedLayerIds: string[]
  camera: CameraState
  activeTool: ToolType
  ui: UIState
  lifecycleStatus: DesignLifecycleStatus
  designId?: string // Backend design ID when loaded from server
  sessionId?: string // Backend editor-session ID (cloud save)
  product?: { id: string; slug: string; name: string; type: string; category?: string; boxType?: string; /** M8-D: canonical dieline blueprint (M8-B EditorConfig passthrough) — the single inputs for the migrated dieline UI. */
    dieline?: DielineBlueprint
    /** M8-H: prepress baseline passthrough (caliper/flute/tolerance) snapshot. */
    prepress?: { caliperMm?: number; fluteType?: string; glueFlapToleranceMm?: number }
    /** M8-J (spec §14): product-coverage support flag — `deferred` products render a deferral placeholder instead of the M7 generic net. */
    support?: 'supported' | 'deferred'
    supportReason?: string }
  productConfig?: { selectedSize?: string; selectedMaterial?: string; selectedFinish?: string; quantity?: number; customDimensions?: ModelDimensions; variantId?: string; sku?: string }
  /** M7: Backend-issued product structure (faces/zones/rules) for prepress + surfaces. */
  structureType?: string
  zones?: Record<string, FaceZone[]>
  /** M8-H: provenance of the load that produced this state — carried into the
   *  next save so legacy (`migrated`/`best_effort`) lineage is never re-claimed
   *  as exactly reproducible. */
  manifestMetadata?: { schemaVersion: number; manifestSource: "blueprint" | "migrated"; reproducibility: "exact" | "best_effort" }
}

export interface DesignState extends DesignCoreState {
  history: HistoryState<DesignCoreState>
}


