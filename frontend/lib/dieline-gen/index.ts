// Batch R — parametric dieline generator (in-house, no paid library).
// Four box types: mailer (FEFCO 0427 style), shipping carton RSC
// (FEFCO 0201), pizza box (0427 family), tuck-end carton (ECMA family).
// Sits beside the editor's template-based dieline engine; nothing in the
// editor calls this module.

import type { BoxSpec, Dieline, DielineOptions, DielineType } from "./types.ts"
import { generateRsc } from "./rsc.ts"
import { generateMailer } from "./mailer.ts"
import { generatePizza } from "./pizza.ts"
import { generateTuck } from "./tuck.ts"
import { generateSnaplock } from "./snaplock.ts"
import { generatePillow } from "./pillow.ts"
import { generateSleeve } from "./sleeve.ts"
import { generateEnvelope } from "./envelope.ts"
import { generateAutobottom } from "./autobottom.ts"
import { generateRigid } from "./rigid.ts"
import { generateMagnethinge } from "./magnethinge.ts"
import { generateFlat } from "./flat.ts"
import { generatePouch } from "./pouch.ts"
import { generateBag } from "./bag.ts"
import { generateCup } from "./cup.ts"
import { generateTube } from "./tube.ts"
import { generateCarrier } from "./carrier.ts"
import { generatePocket } from "./pocket.ts"
import { generateDisc } from "./disc.ts"

export type { BoxSpec, Dieline, DielineOptions, DielineType, Panel, FoldLine, Feature, Pt } from "./types.ts"
export { checkDieline, type CheckReport } from "./checks.ts"
export { renderDielineSvg } from "./svg.ts"
export { layoutLabels, checkLabels, MIN_LABEL_MM, type LabelLayout, type LegendEntry } from "./labels.ts"

export const DEFAULT_OPTIONS: DielineOptions = {
  bleed: 3,
  slotGap: 3,
  meetGap: 2,
  glueWidth: 15,
  vents: true,
  tuckStyle: "straight",
  lidShare: 0.3,
  lidClearance: 1,
  magnetDiameter: 10,
  magnetInset: 6,
  hingeWidth: 6,
  flapHeight: 40,
  sealWidth: 10,
  zipHeight: 0,
  tearNotch: false,
  valve: false,
  valveSize: 20,
  seamOverlap: 15,
  arcSegments: 48,
  handleWidth: 100,
  handleHeight: 25,
  handleInset: 20,
  layoutGap: 10,
}

/**
 * Input validation. Dimensions are the erected box's INTERNAL size in
 * mm (FEFCO convention). Limits: 25–1200 mm per dimension, board
 * 0.3–10 mm, plus per-type minima so the moving parts fit.
 */
export function validateSpec(spec: BoxSpec, type?: DielineType): void {
  const { length, width, height, thickness } = spec
  for (const [name, v] of [
    ["length", length],
    ["width", width],
  ] as const) {
    if (!Number.isFinite(v) || v < 25 || v > 1200) {
      throw new RangeError(`${name} must be between 25 and 1200 mm (got ${v})`)
    }
  }
  // Batch T12: a flat sheet's height field carries its
  // nominal thickness (see flat.ts) — its own range and
  // an equality with thickness replace the box range.
  if (type === "flat") {
    if (!Number.isFinite(height) || height < 0.3 || height > 10) {
      throw new RangeError(`height (nominal sheet thickness) must be between 0.3 and 10 mm for a flat sheet (got ${height})`)
    }
    if (Math.abs(height - thickness) > 1e-9) {
      throw new RangeError(`for a flat sheet, height is the nominal sheet thickness and must equal thickness (got height ${height}, thickness ${thickness})`)
    }
  } else if (type === "bag") {
    // Batch T13: same flat-pattern contract as "flat" — the
    // height field carries the nominal filled thickness.
    if (!Number.isFinite(height) || height < 0.3 || height > 10) {
      throw new RangeError(`height (nominal filled thickness) must be between 0.3 and 10 mm for a sealed bag (got ${height})`)
    }
    if (Math.abs(height - thickness) > 1e-9) {
      throw new RangeError(`for a sealed bag, height is the nominal filled thickness and must equal thickness (got height ${height}, thickness ${thickness})`)
    }
  } else if (type === "pocket" || type === "disc") {
    // Batch T14: same flat-pattern contract — the height
    // field carries the nominal thickness.
    if (!Number.isFinite(height) || height < 0.3 || height > 10) {
      throw new RangeError(`height (nominal thickness) must be between 0.3 and 10 mm for a flat pattern (got ${height})`)
    }
    if (Math.abs(height - thickness) > 1e-9) {
      throw new RangeError(`for a flat pattern, height is the nominal thickness and must equal thickness (got height ${height}, thickness ${thickness})`)
    }
  } else if (!Number.isFinite(height) || height < 25 || height > 1200) {
    throw new RangeError(`height must be between 25 and 1200 mm (got ${height})`)
  }
  if (!Number.isFinite(thickness) || thickness < 0.3 || thickness > 10) {
    throw new RangeError(`thickness must be between 0.3 and 10 mm (got ${thickness})`)
  }
  if ((type === "mailer" || type === "pizza") && height < 30) {
    throw new RangeError(`height must be at least 30 mm for a ${type} box (the tuck/flap geometry needs it; got ${height})`)
  }
  if (type === "pizza" && (length < 100 || width < 100)) {
    throw new RangeError(`length and width must be at least 100 mm for a pizza box (got ${length} × ${width})`)
  }
  if (type === "magnethinge" && height < 40) {
    throw new RangeError(`height must be at least 40 mm for a two-piece rigid box (the base and lid skirt both need wall height; got ${height})`)
  }
  if (type === "rigid_magnetic" && length < 40) {
    throw new RangeError(`length must be at least 40 mm for a magnetic rigid box (two 10 mm magnet pockets and the wall label must fit; got ${length})`)
  }
  if (type === "tuck" && width < 20) {
    throw new RangeError(`width (depth) must be at least 20 mm for a tuck-end box (got ${width})`)
  }
  if (type === "snaplock" && (width + thickness) / 2 + 23 > length + thickness) {
    throw new RangeError(
      `snap-lock tab would fall off the main flap: length ${length} mm is too short for depth ${width} mm (the slit centre sits (W + t)/2 + 12.5 mm from the panel's edge and the 20 mm slit plus margin must fit inside the panel)`,
    )
  }
}

export function generateDieline(type: DielineType, spec: BoxSpec, options?: Partial<DielineOptions>): Dieline {
  validateSpec(spec, type)
  const opts: DielineOptions = { ...DEFAULT_OPTIONS, ...(options ?? {}) }
  if (!(opts.bleed >= 0 && opts.bleed <= 10)) throw new RangeError(`bleed must be between 0 and 10 mm (got ${opts.bleed})`)
  if (type === "magnethinge") {
    if (!(opts.lidShare > 0.05 && opts.lidShare < 0.95)) throw new RangeError(`lidShare must be between 0.05 and 0.95 (got ${opts.lidShare})`)
    if (!(opts.lidClearance >= 0 && opts.lidClearance <= 10)) throw new RangeError(`lidClearance must be between 0 and 10 mm (got ${opts.lidClearance})`)
  }
  if (type === "pouch" || type === "bag" || type === "carrier" || type === "pocket") {
    if (!(opts.sealWidth > 0 && opts.sealWidth <= 50)) throw new RangeError(`sealWidth must be between 0 and 50 mm (got ${opts.sealWidth})`)
    if (!(opts.zipHeight >= 0 && opts.zipHeight <= 100)) throw new RangeError(`zipHeight must be between 0 and 100 mm (got ${opts.zipHeight})`)
    if (!(opts.valveSize > 0 && opts.valveSize <= 100)) throw new RangeError(`valveSize must be between 0 and 100 mm (got ${opts.valveSize})`)
  }
  if (type === "cup" || type === "tube") {
    if (!(opts.seamOverlap > 0 && opts.seamOverlap <= 100)) throw new RangeError(`seamOverlap must be between 0 and 100 mm (got ${opts.seamOverlap})`)
  }
  if (type === "cup" || type === "disc") {
    if (!Number.isInteger(opts.arcSegments) || opts.arcSegments < 8 || opts.arcSegments > 360 || opts.arcSegments % 4 !== 0) throw new RangeError(`arcSegments must be an integer between 8 and 360 and divisible by 4 (got ${opts.arcSegments})`)
  }
  if (type === "carrier") {
    if (!(opts.handleWidth > 0 && opts.handleWidth <= 500)) throw new RangeError(`handleWidth must be between 0 and 500 mm (got ${opts.handleWidth})`)
    if (!(opts.handleHeight > 0 && opts.handleHeight <= 200)) throw new RangeError(`handleHeight must be between 0 and 200 mm (got ${opts.handleHeight})`)
    if (!(opts.handleInset >= 0 && opts.handleInset <= 200)) throw new RangeError(`handleInset must be between 0 and 200 mm (got ${opts.handleInset})`)
  }
  if (type === "pocket") {
    if (!(opts.layoutGap > 0 && opts.layoutGap <= 100)) throw new RangeError(`layoutGap must be above 0 and at most 100 mm (got ${opts.layoutGap}); at 0 the two webs share a boundary`)
  }
  switch (type) {
    case "rsc":
      return generateRsc(spec, opts)
    case "mailer":
      return generateMailer(spec, opts)
    case "pizza":
      return generatePizza(spec, opts)
    case "tuck":
      return generateTuck(spec, opts)
    case "snaplock":
      return generateSnaplock(spec, opts)
    case "pillow":
      return generatePillow(spec, opts)
    case "sleeve":
      return generateSleeve(spec, opts)
    case "envelope":
      return generateEnvelope(spec, opts)
    case "autobottom":
      return generateAutobottom(spec, opts)
    case "rigid":
      return generateRigid(spec, opts)
    case "rigid_magnetic":
      return generateRigid(spec, opts, true)
    case "magnethinge":
      return generateMagnethinge(spec, opts)
    case "flat":
      return generateFlat(spec, opts)
    case "pouch":
      return generatePouch(spec, opts)
    case "bag":
      return generateBag(spec, opts)
    case "cup":
      return generateCup(spec, opts)
    case "tube":
      return generateTube(spec, opts)
    case "carrier":
      return generateCarrier(spec, opts)
    case "pocket":
      return generatePocket(spec, opts)
    case "disc":
      return generateDisc(spec, opts)
  }
  throw new RangeError(`unknown dieline type: ${type}`)
}
