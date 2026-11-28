// Batch R — parametric dieline generator: shared types.
//
// Conventions (documented in the batch report):
// - Inputs are the erected box's INTERNAL dimensions in mm, following the
//   FEFCO convention (internal L × W × H). Outer dimensions are therefore
//   internal + 2t per axis.
// - Score (fold) lines sit on the board centreline: a score-to-score span
//   across an internal dimension D is D + t. Folded internal dimensions
//   recover as score span − t, which is what the checks verify.
// - Blank coordinates are mm, origin at the blank's top-left, y down
//   (SVG orientation).

export interface Pt {
  x: number
  y: number
}

export interface BoxSpec {
  length: number
  width: number
  height: number
  thickness: number
}

export interface DielineOptions {
  /** Bleed offset around the cut silhouette, mm. Default 3. */
  bleed: number
  /** Gap between adjacent flaps (the slot width), mm. Default 3. */
  slotGap: number
  /** Gap left where two RSC flaps meet at the centre, mm. Default 2. */
  meetGap: number
  /** Glue flap width before per-type caps, mm. Default 15. */
  glueWidth: number
  /** Pizza only: cut vent holes in the lid. Default true. */
  vents: boolean
  /** Tuck-end only: both tucks on one panel (straight) or opposite panels (reverse). */
  tuckStyle: "straight" | "reverse"
  /** Two-piece types only: share of the internal height carried by
   * the lid skirt (the base carries the rest). Stated parameter,
   * not a verified value. Default 0.3. */
  lidShare: number
  /** Two-piece types only: lid clearance per side, mm — the lid's
   * internal footprint is the base's outer footprint plus twice
   * this. Stated parameter, not a verified fit value. Default 1. */
  lidClearance: number
  /** Magnetic types only: magnet disc diameter, mm. Stated
   * parameter — no magnet data exists in the catalogue. Default 10. */
  magnetDiameter: number
  /** Magnetic types only: distance from the panel's free edge to
   * the magnet centre's offset line, mm. Stated parameter.
   * Default 6. */
  magnetInset: number
  /** Hinged magnetic type only: hinge strip height, mm. Stated
   * parameter. Default 6. */
  hingeWidth: number
  /** Hinged magnetic type only: front flap height, mm. Stated
   * parameter. Default 40. */
  flapHeight: number
  /** Film types only (pouch, bag): seal width, mm — side, top
   * and bottom seals and the flap adhesive strip are placed
   * from it. Stated parameter — the catalogue states no seal
   * width for the film products. Default 10. */
  sealWidth: number
  /** Film types only: zip strip height, mm; 0 means no zip.
   * Stated parameter. Default 0. */
  zipHeight: number
  /** Pouch only: cut tear notches in the side seals at the
   * top seal. Stated option. Default false. */
  tearNotch: boolean
  /** Pouch only: place a one-way valve feature on the front
   * panel (the doypack_valve product). Default false. */
  valve: boolean
  /** Pouch only: valve feature size (square), mm. Stated
   * parameter. Default 20. */
  valveSize: number
  /** Cup and tube only: seam tab width, mm (for the cup,
   * the tab's arc length at the outer radius). Stated
   * parameter. Default 15. */
  seamOverlap: number
  /** Cup and disc only: number of polygon segments used
   * to approximate each arc / the circle. Stated parameter
   * — the library represents curves as segmented polygons,
   * never true arcs. Must be divisible by 4. Default 48. */
  arcSegments: number
  /** Carrier only: die-cut handle slot width, mm. Stated
   * parameter. Default 100. */
  handleWidth: number
  /** Carrier only: die-cut handle slot height, mm. Stated
   * parameter. Default 25. */
  handleHeight: number
  /** Carrier only: distance from the panel's top edge to
   * the handle slot's top, mm. Stated parameter.
   * Default 20. */
  handleInset: number
  /** Pocket only: layout gap between the two webs in the
   * flat pattern, mm. Stated parameter. Default 10. */
  layoutGap: number
}

export type PanelKind = "panel" | "flap" | "glue" | "tuck" | "dust" | "lid" | "roll" | "wall"

export interface Panel {
  id: string
  name: string
  kind: PanelKind
  /** Closed polygon, blank coordinates (mm). */
  polygon: Pt[]
  /** Bounding-box width/height of the polygon (mm). */
  width: number
  height: number
  labelAt: Pt
  dimsLabel: string
  /** For tuck panels: the panel the flap hinges on. */
  hingePanel?: string
  /** Panels sharing a group id must have equal widths (checked). */
  group?: string
}

export interface FoldLine {
  from: Pt
  to: Pt
  crease: "valley" | "mountain"
  between: [string, string]
  /** True when the crease lies inside a single panel (a tuck tongue bend). */
  internal?: boolean
}

export interface Feature {
  kind: "slot" | "vent" | "tab" | "magnet" | "seal" | "zip" | "valve" | "notch"
  /** Centre of the feature, blank coordinates (mm). */
  at: Pt
  w: number
  h: number
  r?: number
}

export type DielineType = "rsc" | "mailer" | "pizza" | "tuck" | "snaplock" | "pillow" | "sleeve" | "envelope" | "autobottom" | "rigid" | "rigid_magnetic" | "magnethinge" | "flat" | "pouch" | "bag" | "cup" | "tube" | "carrier" | "pocket" | "disc"

export interface Dieline {
  type: DielineType
  spec: BoxSpec
  options: DielineOptions
  panels: Panel[]
  folds: FoldLine[]
  features: Feature[]
  blankWidth: number
  blankHeight: number
  /** Public style reference followed, and what was simplified. */
  styleNote: string
}
