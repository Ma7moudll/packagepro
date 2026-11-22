// Shared types between frontend and backend
// These match the backend Prisma models and API contracts

export type UserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  company?: string
  createdAt: string
}

export type OrderStatus =
  | 'pending_review'
  | 'awaiting_approval'
  | 'ready_for_routing'
  | 'vendor_confirmed'
  | 'in_production'
  | 'quality_check'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'failed' | 'refunded'
export type PaymentMethod = 'stripe' | 'paypal' | 'cod'

export interface DesignFile {
  id: string
  designId: string
  fileType:
    | 'logo'
    | 'preview'
    | 'print_file'
    | 'dieline'
    | 'proof'
    | 'export'
  fileName: string
  fileUrl: string
  fileSize?: number | null
  mimeType?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: string
}

export interface Design {
  id: string
  sessionId?: string | null
  name?: string
  status?: string
  files?: DesignFile[]
  order?: Order | null
  createdAt?: string
  updatedAt?: string
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  status: OrderStatus
  items: OrderItem[]
  shippingAddress: ShippingAddress
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  subtotal: number
  tax: number
  shipping: number
  total: number
  currency: string
  notes?: string
  designSessionId?: string
  /** Linked design + persisted files (preview/print/proof) from getOrder. */
  design?: Design | null
  trackingNumber?: string
  invoiceId?: string
  /** Backend authoritative field name — BE Prisma returns `shippingCost`. */
  shippingCost?: number
  /** 4c: per-group shipping split persisted in order metadata at creation. */
  shippingBreakdown?: ShippingGroup[] | null
  /** Shipment projection included by getOrder and getCustomerOrders. */
  shipment?: Shipment
  /** Payment relation included on order reads (serialized by the backend). */
  payment?: { currency?: string; status?: string; amount?: number } | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productType: string
  quantity: number
  dimensions: Dimensions
  materialCode: string
  /** Backend legacy column name (`material`) mirrored for serialization fidelity. */
  material?: string | null
  color?: string
  finish?: string
  unitPrice: number
  totalPrice: number
  // Traceability: catalog + design references persisted on the order line.
  productId?: string | null
  variantId?: string | null
  sku?: string | null
  config?: Record<string, unknown> | null
  designId?: string | null
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  city: string
  state?: string
  postalCode: string
  country: string
}

export interface Dimensions {
  length: number
  width: number
  height?: number
  unit: 'cm' | 'mm' | 'inch'
}

export interface PricingRequest {
  productType: string
  quantity: number
  dimensions: Dimensions
  materialCode?: string
  complexity?: 'simple' | 'medium' | 'complex'
  taxRate?: number
  weightPerUnit?: number
}

export interface PricingResponse {
  totalPrice: number
  breakdown: PricingBreakdown
  material: {
    code: string
    name: string
    unitPrice: number
    /** ISO currency of the material rate card ("EGP" — the pricing engine
     *  rejects non-EGP rate cards); the backend has always returned it, the
     *  type just didn't say so. */
    currency?: string
  }
  productType: string
  quantity: number
  dimensions: Dimensions
}

export interface PricingBreakdown {
  surfaceArea: number
  materialCost: number
  conversionCost: number
  optionsMarkup?: number
  optionsMarkupPerUnit?: number
  discountFactor?: number
  discountApplied?: number
  marginAmount: number
  subtotal: number
  tax: number
  shippingEstimate: number
  total: number
}

export interface MaterialCost {
  code: string
  name: string
  unitPrice: number
  currency: string
}

export interface Product {
  id: string
  name: { en: string; ar: string }
  tagline?: { en: string; ar: string }
  description: { en: string; ar: string }
  images: string[]
  category: string
  sizes: ProductSize[]
  materialColors: MaterialColorOption[]
  printModes: PrintModeOption[]
  printCoverages: PrintCoverageOption[]
  productionTimes: ProductionTimeOption[]
  specifications: Record<string, { en: string; ar: string }>
  styles: StyleOption[]
  parcelSizes?: string[]
}

export interface ProductSize {
  label: string
  dim: string
  dimensions?: { length: number; width: number; height: number; unit: string }
  price: number
}

export interface MaterialColorOption {
  id: string
  label: { en: string; ar: string }
  color: string
  bg: string
  materialCode?: string
}

export interface PrintModeOption {
  id: string
  label: { en: string; ar: string }
  desc: { en: string; ar: string }
}

export interface PrintCoverageOption {
  id: string
  label: { en: string; ar: string }
}

export interface ProductionTimeOption {
  id: string
  label: { en: string; ar: string }
  days: string
  premium: boolean
}

export interface StyleOption {
  id: string
  label: { en: string; ar: string }
  desc: { en: string; ar: string }
}

export interface CreateOrderRequest {
  items: {
    productType: string
    quantity: number
    dimensions: Dimensions
    materialCode?: string
    color?: string
    finish?: string
  }[]
  shippingAddress: ShippingAddress
  notes?: string
  designSessionId?: string
  paymentMethod: PaymentMethod
}

export interface CreateOrderResponse {
  orderId: string
  orderNumber: string
  total: number
  paymentIntentSecret?: string
  paypalOrderId?: string
  status: OrderStatus
}

export interface PaymentIntentRequest {
  orderId: string
  currency?: string
}

export interface PaymentIntentResponse {
  clientSecret: string
  paymentIntentId: string
}

export interface ShippingRate {
  id: string
  name: string
  carrier: string
  service: string
  price: number
  estimatedDays: number
  trackingAvailable: boolean
}

export interface Shipment {
  id: string
  orderId: string
  trackingNumber?: string
  carrier?: string
  labelUrl?: string
  trackingUrl?: string
  /** Full status union covering backend ShipmentStatus enum + real backend state machine. */
  status:
    | "created"
    | "label_generated"
    | "pending"
    | "processing"
    | "picked_up"
    | "shipped"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failed"
  estimatedDelivery?: string
  /** Backend field name for estimated delivery datetime. */
  estimatedDeliveryDate?: string | null
  /** DHL-specific tracking number (distinct from the universal trackingNumber). */
  dhlTrackingNumber?: string | null
  /** Remote tracking events from carrier API — shape is opaque JSON. */
  trackingEvents?: unknown
  actualDeliveryDate?: string | null
  createdAt?: string
  updatedAt?: string
}

export enum DesignLifecycle {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PRODUCTION = 'IN_PRODUCTION',
}

export type NotificationType =
  | 'order_created'
  | 'approval_required'
  | 'production_started'
  | 'shipment_created'
  | 'delivery_confirmed'
  | 'review_requested'
  | 'handshake_requested'
  | 'payment_received'
  | 'settlement_completed'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string | null
  read: boolean
  metadata?: Record<string, unknown> | null
  createdAt: string
  readAt?: string | null
}

export interface Template {
  id: string
  name: string
  description?: string | null
  category: string
  thumbnail: string
  designData: Record<string, unknown>
  productType: string
  boxType?: string | null
  isPublic: boolean
  usageCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  id: string
  templateId?: string | null
  sessionId?: string | null
  productType: string
  productId?: string | null
  variantId?: string | null
  sku?: string | null
  config?: Record<string, unknown> | null
  quantity: number
  dimensions: Dimensions
  materialCode?: string | null
  color?: string | null
  finish?: string | null
  name?: string | null
  thumbnail?: string | null
  unitPrice: number
  totalPrice: number
  shipping: number
  tax: number
  breakdown?: Record<string, unknown> | null
}

export interface CartSummary {
  subtotal: number
  tax: number
  shipping: number
  total: number
  currency: string
  itemsCount: number
  /** 4c: per productType-group shipping (the multi-vendor PO grouping). */
  shippingByGroup?: ShippingGroup[]
}

/** One vendor-group's share of an order's shipping (Step-4 Piece 4c). */
export interface ShippingGroup {
  productType: string
  shipping: number
}

export interface Cart {
  cartId: string
  currency: string
  items: CartItem[]
  summary: CartSummary
}

export interface AddCartItemRequest {
  productType: string
  productId?: string
  variantId?: string
  sku?: string
  config?: Record<string, string>
  quantity: number
  dimensions: Dimensions
  materialCode?: string
  color?: string
  finish?: string
  templateId?: string
  sessionId?: string
}

export interface CheckoutAddress {
  name: string
  phone: string
  email?: string
  street: string
  city: string
  state?: string
  postalCode: string
  country: string
}

export interface CheckoutRequest {
  shippingAddress: CheckoutAddress
  notes?: string
  designSessionId?: string
}

export interface CheckoutResponse {
  orderId: string
  orderNumber: string
  total: number
  status: OrderStatus
  clientSecret: string
  paymentIntentId: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================
// PRODUCT CATALOG (backend-driven marketplace, Packhelp-style)
// ============================================================

export type ProductCustomisation = 'custom' | 'plain' | 'pre_printed'

/** Unified-catalogue readiness verdict (shared/catalog/products.ts). */
export interface CatalogReadiness {
  preview: 'supported' | 'in_progress' | 'unavailable'
  dieline: 'supported' | 'deferred'
  pricing: 'estimated' | 'quote_required'
}

export interface CatalogProductSummary {
  id: string
  slug: string
  name: string
  shortDescription?: string | null
  productType: string
  boxType?: string | null
  customisation: ProductCustomisation
  customisable: boolean
  moq: number
  priceFrom?: number | null
  thumbnail?: string | null
  gallery: string[]
  ecoFlags?: Record<string, unknown> | null
  editorDefaults?: Record<string, unknown> | null
  /** Currency of priceFrom — always EGP (pricing-engine enforced). */
  currency?: string
  /** Editor picker ProductType this catalogue row unifies with. */
  editorType?: string
  /** Three-axis readiness; listing never implies sale-readiness. */
  readiness?: CatalogReadiness
  /** Explicit production support verdict ('supported' | 'deferred'). */
  support?: string
  supportReason?: string
}

export interface CatalogSubcategory {
  id: string
  slug: string
  name: string
  description?: string | null
  image?: string | null
  products: CatalogProductSummary[]
}

export interface CatalogCategory {
  id: string
  slug: string
  name: string
  description?: string | null
  image?: string | null
  subcategories: CatalogSubcategory[]
}

export interface CatalogSizeOption {
  code: string
  name: string
  length: number
  width: number
  height: number
}

export interface CatalogOptionValue {
  label: string
  value: string
  priceDelta?: number | null
  priceType: string
  appliesTo?: Record<string, unknown> | null
  isDefault: boolean
}

export interface CatalogOption {
  key: string
  label: string
  control: string
  required: boolean
  values: CatalogOptionValue[]
}

export interface CatalogVariant {
  id: string
  sku: string
  sizeCode?: string | null
  materialCode?: string | null
  color?: string | null
  printMode: string
  printSides: string
  finish?: string | null
  dimensions: Dimensions
  isDefault: boolean
}

export interface QuantityTier {
  minQuantity: number
  factor: number
}

export interface CatalogProductDetail extends CatalogProductSummary {
  description?: string | null
  sizeUnit: string
  baseSizes: CatalogSizeOption[]
  minDimensions: Dimensions | Record<string, unknown>
  maxDimensions: Dimensions | Record<string, unknown>
  defaultDimensions: Dimensions | Record<string, unknown>
  variants: CatalogVariant[]
  options: CatalogOption[]
  quantityTiers: QuantityTier[]
  category: { id: string; slug: string; name: string }
  subcategory: { id: string; slug: string; name: string }
}

export type CatalogConfig = Record<string, string>

export interface CatalogQuoteRequest {
  variantId?: string
  quantity: number
  dimensions?: Dimensions
  config?: CatalogConfig
  complexity?: 'simple' | 'medium' | 'complex'
  taxRate?: number
}

export interface ResolvedCatalogOption {
  key: string
  label: string
  value: string
  optionLabel: string
  priceDelta: number | null
  priceType: string
}

export interface CatalogQuote {
  product: CatalogProductSummary
  variant: {
    id: string | null
    sku: string
    sizeCode: string | null
    dimensions: Dimensions | Record<string, unknown>
    custom: boolean
  }
  quantity: number
  moq: number
  config: ResolvedCatalogOption[]
  material: MaterialCost
  breakdown: PricingBreakdown
  totalPrice: number
  unitPrice: number
  tiers: QuantityTier[]
}

// ---------------------------------------------------------------------------
// M7: Product-Aware Design Editor types
// ---------------------------------------------------------------------------

/** Union of all face identifiers the editor supports. */
export type FaceId =
  | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'
  | 'inside_front' | 'inside_back' | 'inside_left' | 'inside_right'
  | 'inside_top' | 'inside_bottom'

/** Per-variant packaging structure — stored in Product.editorDefaults. */
export interface ProductStructure {
  type: string
  brand: string
  boxType?: string
  defaultSizes: Array<{
    code: string
    label: string
    dims: { length: number; width: number; height: number }
  }>
  faces: Record<FaceId, {
    width: number
    height: number
    depth: number
    label: string
  }>
  zones: Record<FaceId, Array<{
    label: string
    required: boolean
    position: [number, number, number]
    rotation?: [number, number, number]
  }>>
  rules: ProductRules
  boxTypeOptions?: Array<{ value: string; label: string; group?: string }>
  editorFields?: string[]
}

export interface ProductRules {
  moq: number
  printing: {
    outside: {
      modes: string[]
      sides: number[]
      labels: Record<string, string>
    }
    inside?: boolean
  }
  finishing: {
    lamination?: string[]
    coating?: string[]
    foil?: string[]
    emboss?: boolean
    spotUV?: boolean
  }
  colorOptions?: string[]
  materialOptions?: Array<{ code: string; label: string }>
  adhesiveOptions?: Array<{ value: string; label: string; group?: string; priceDelta: number }>
  gussetOptions?: Array<{ value: string; label: string; priceDelta: number }>
  coatingOptions?: Array<{ value: string; label: string; priceDelta: number }>
  handleOptions?: Array<{ value: string; label: string; priceDelta: number }>
  handleTypeOptions?: Array<{ value: string; label: string; priceDelta: number }>
  reinforcementBaseOptions?: Array<{ value: string; label: string; priceDelta: number }>
  gussetTypeOptions?: Array<{ value: string; label: string; priceDelta: number }>
  dimensionConstraints?: { unit: string; min: [number, number, number]; max: [number, number, number] }
  printSides?: number[]
  fluteOptions?: Array<{ value: string; label: string; group?: string }>
  variantSizeOptions?: Array<{ value: string; label: string; group?: string; priceDelta: number }>
}

// ---------------------------------------------------------------------------
// M8-B: Packaging blueprint — canonical dieline template (M8_SPEC §7–§8)
// Per-product template stored in Product.editorDefaults. The backend stores it
// JSON-only; the geometry engine (M8-C) derives paths from it. JSON-only —
// no path/bezier geometry, no schemaVersion=2, no new Prisma columns.
// ---------------------------------------------------------------------------

export type LineClass = 'cut' | 'fold' | 'score' | 'glue' | 'perf'
export type EdgeName = 'top' | 'right' | 'bottom' | 'left'

export interface DielineEdge {
  class: LineClass
  to?: FaceId | 'glue_flap' | 'none'
}

export interface DielinePanel {
  faceId: FaceId
  x: number
  y: number
  w: number
  h: number
  rotation: 0 | 90 | 180 | 270
  edges: Partial<Record<EdgeName, DielineEdge>>
}

export interface DielineBlueprint {
  schemaVersion: number
  boxType: string
  faceOrder: FaceId[]
  panels: Record<FaceId, DielinePanel>
  outline: { w: number; h: number }
}

export interface PrepressConfig {
  caliperMm: number
  fluteType: string
  glueFlapToleranceMm: number
}

// ---------------------------------------------------------------------------
// M8-C: Canonical dieline geometry (M8_SPEC §7 AMENDMENT 2) — engine output
// of buildDieline(blueprint, dims) in millimeters. Type-only additions; the
// backend stores the blueprint JSON and consumes resolved geometry from the
// persisted manifest (M8-H). No curves are implemented in M8 (future-capable).
// ---------------------------------------------------------------------------

export interface DielinePoint {
  x: number
  y: number
}

export interface DielinePath {
  /** Stable, deterministic id (e.g. `${faceId}-${edgeName}`, `outline`). */
  id: string
  /** Owning face when the path bounds/scores that face. */
  faceId?: FaceId
  class: LineClass
  /** Polyline in mm (open or closed). */
  points: DielinePoint[]
  closed?: boolean
}

export interface DielineAdjacencyEntry {
  a: FaceId
  b: FaceId
  via: EdgeName
  class: LineClass
}

export interface DielineFaceRelationship {
  faceId: FaceId
  /** 0..N mesh part ids (AMENDMENT 1) — never a new FaceId. */
  meshPartIds: string[]
}

export interface DielineGeometry {
  schemaVersion: number
  boxType: string
  /** Product dims this geometry was resolved from (mm). */
  dims: { length: number; width: number; height: number; unit: 'mm' }
  /** Semantic faces (rectangular extent metadata), keyed by FaceId. */
  panels: Record<FaceId, DielinePanel>
  /** Production cut paths (mm polylines). */
  cutPaths: DielinePath[]
  foldPaths: DielinePath[]
  scorePaths: DielinePath[]
  gluePaths: DielinePath[]
  /** Perforations — future-facing, may be empty in M8. */
  perfPaths: DielinePath[]
  /** Outer flat boundary (closed). */
  outline: DielinePath[]
  /** Face-pair assembly relationships, deduplicated (a<b). */
  adjacency: DielineAdjacencyEntry[]
  faceRelationships: DielineFaceRelationship[]
}

/** Panel AABB overlap pair in canonical mm space (checkOverlaps output). */
export interface DielineOverlap {
  a: FaceId
  b: FaceId
}

/** Canonical editor configuration returned by GET /catalog/:slug/editor-config. */
export interface EditorConfig {
  product: {
    id: string
    slug: string
    name: string
    type: string
    boxType?: string
    structure?: ProductStructure
    /** M8-B: additive blueprint passthrough — present when the product has one. */
    schemaVersion?: number
    unit?: 'mm'
    dieline?: DielineBlueprint
    prepress?: PrepressConfig
    /**
     * M8-J (spec §14): product-coverage support flag. `"supported"` carries a
     * canonical blueprint+dieline; `"deferred"` carries NO blueprint and must
     * never be shipped with fake geometry. Absent on legacy editorDefaults
     * blobs that predate M8-J.
     */
    support?: 'supported' | 'deferred'
    supportReason?: string
  }
  variant: {
    id: string
    sku: string
    sizeCode: string | null
    materialCode: string | null
    color?: string
    printMode: string
    printSides: number
    finish: string
    dimensions: Dimensions
  }
  material: {
    code: string
    name: string
    hex: string
    texture?: string
  }
  quantity: number
  pricing: {
    unitPrice: number
    totalPrice: number
    currency: string
  }
  sessionId?: string
}
