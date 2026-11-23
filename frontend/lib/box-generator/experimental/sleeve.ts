/**
 * Original PackagePro experimental open-ended sleeve component.
 * No external template, standard drawing or vendor implementation is included.
 * This is deliberately NOT wired into the production DielineGeometry contract.
 * Input dimensions are score-to-score, not guaranteed inside/outside/fit sizes.
 */
export interface SleeveInput {
  length: number
  width: number
  height: number
  unit: "mm" | "cm" | "inch"
  glueFlap: number
  /** Recorded in mm only. No automatic bend allowance is assumed. */
  caliperMm: number
}
export interface Point2 { x: number; y: number }
export interface Point3 { x: number; y: number; z: number }
export interface SleevePanel {
  id: "front" | "right" | "back" | "left" | "glue"
  x: number
  width: number
}
export interface ExperimentalSleeve {
  kind: "experimental-sleeve-component"
  unit: "mm"
  dimensionBasis: "score-to-score"
  productionApproved: false
  compensationApplied: false
  dimensions: { length: number; width: number; height: number }
  caliperMm: number
  glueFlapMm: number
  blank: { width: number; height: number }
  panels: SleevePanel[]
  /** One closed, non-self-intersecting cut contour, without a repeated endpoint. */
  cut: Point2[]
  creases: { x: number; y0: number; y1: number }[]
  warnings: readonly string[]
}
const WARNINGS = [
  "EXPERIMENTAL COMPONENT ONLY. Not a complete mailer-box-with-sleeve product.",
  "Score-to-score dimensions. Inside fit, clearance and caliper compensation are NOT calculated.",
  "No manufacturer approval. Confirm stock, grain, score tooling, glue, tolerances and fit with a physical sample.",
  "No artwork, bleed, safe areas, CMYK, spot plates or factory-ready export. SVG is a geometric review drawing.",
  "Fold preview uses zero-thickness rigid panels. It does not verify collisions, adhesion or physical foldability.",
] as const
const IDS = ["front", "right", "back", "left", "glue"] as const

export function generateExperimentalSleeve(input: SleeveInput): ExperimentalSleeve {
  const factor = input.unit === "mm" ? 1 : input.unit === "cm" ? 10 : input.unit === "inch" ? 25.4 : NaN
  if (!Number.isFinite(factor)) throw new RangeError("unit must be mm, cm or inch")
  const [length, width, height, glue] = [input.length, input.width, input.height, input.glueFlap].map(v => {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new RangeError("dimensions must be finite numbers")
    return v * factor
  })
  // These are software review limits, NOT a manufacturing capability range.
  if ([length, width, height].some(v => v < 5 || v > 2000)) {
    throw new RangeError("experimental dimensions must be between 5 and 2000 mm")
  }
  if (glue <= 0 || glue > Math.min(length, width) / 2) {
    throw new RangeError("glue flap must be positive and at most half the smaller cross-section panel")
  }
  if (typeof input.caliperMm !== "number" || !Number.isFinite(input.caliperMm) || input.caliperMm <= 0 || input.caliperMm > Math.min(length, width) / 10) {
    throw new RangeError("caliperMm must be positive and no more than one tenth of the smaller cross-section panel")
  }
  const widths = [length, width, length, width, glue]
  let x = 0
  const panels = widths.map((panelWidth, i) => {
    const panel = { id: IDS[i], x, width: panelWidth }
    x += panelWidth
    return panel
  })
  const body = 2 * (length + width)
  const bevel = Math.min(glue / 2, height / 4)
  return {
    kind: "experimental-sleeve-component", unit: "mm", dimensionBasis: "score-to-score",
    productionApproved: false, compensationApplied: false,
    dimensions: { length, width, height }, caliperMm: input.caliperMm, glueFlapMm: glue,
    blank: { width: x, height }, panels,
    cut: [{ x: 0, y: 0 }, { x: body, y: 0 }, { x, y: bevel }, { x, y: height - bevel }, { x: body, y: height }, { x: 0, y: height }],
    creases: panels.slice(1).map(p => ({ x: p.x, y0: 0, y1: height })),
    warnings: [...WARNINGS],
  }
}

/** Fold a continuous panel chain from flat (0) to rectangular tube (1).
 * The fifth panel is the glue flap, overlapping the first in the ideal model.
 * Use the returned outline for the bevelled flap, not a full rectangle.
 */
export function foldExperimentalSleeve(sleeve: ExperimentalSleeve, progress: number): { id: SleevePanel["id"]; points: Point3[] }[] {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError("fold progress must be from 0 to 1")
  let x = 0
  let z = 0
  const angle = progress * Math.PI / 2
  const height = sleeve.dimensions.height
  const bevel = Math.min(sleeve.glueFlapMm / 2, height / 4)
  return sleeve.panels.map((panel, i) => {
    const dx = Math.cos(i * angle)
    const dz = Math.sin(i * angle)
    const endX = x + panel.width * dx
    const endZ = z + panel.width * dz
    const points = panel.id === "glue"
      ? [{ x, y: 0, z }, { x: endX, y: bevel, z: endZ }, { x: endX, y: height - bevel, z: endZ }, { x, y: height, z }]
      : [{ x, y: 0, z }, { x: endX, y: 0, z: endZ }, { x: endX, y: height, z: endZ }, { x, y: height, z }]
    x = endX
    z = endZ
    return { id: panel.id, points }
  })
}

/** 1 SVG user unit = 1 mm. Review only, no artwork or prepress claims. */
export function experimentalSleeveSvg(sleeve: ExperimentalSleeve): string {
  const { width, height } = sleeve.blank
  const path = sleeve.cut.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ") + " Z"
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><title>EXPERIMENTAL sleeve component: score-to-score mm, not production approved</title><desc>No clearance or caliper compensation. Physical manufacturer sample required. Red=cut; blue dashed=crease. No artwork or print separations.</desc><g id="CUT" fill="none" stroke="#c42430" stroke-width="0.25"><path d="${path}"/></g><g id="CREASE" fill="none" stroke="#1266b0" stroke-width="0.25" stroke-dasharray="2 1">${sleeve.creases.map(c => `<path d="M${c.x} ${c.y0} L${c.x} ${c.y1}"/>`).join("")}</g></svg>`
}
