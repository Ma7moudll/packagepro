"use client"

export type ToolType = "select" | "text" | "shape" | "draw" | "upload"

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
}

export interface ImageProperties {
  src: string
  naturalWidth?: number
  naturalHeight?: number
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
}

export interface DesignState extends DesignCoreState {
  history: HistoryState<DesignCoreState>
}


