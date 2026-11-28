// Batch T22 — preview feature flags. Each flag defaults
// OFF and is read from a build-time environment
// variable (NEXT_PUBLIC_ variables are inlined by
// Next.js at build time, so in the app these are
// build-time switches, not runtime ones). A test
// override exists so tests can pin both states.
// There is no settings UI and no store field for them.

let sleeveOverride: boolean | null = null

// Gates the sleeve band 3D preview: while off, the
// sleeve product's preview coverage is exactly what it
// was before batch T22 (no family, geometry
// unavailable); while on, coverage reports the
// "sleeve" family and getBoxModel renders SleeveBand.
// Note the coupling: the capability snapshot in
// docs/CURRENT_CAPABILITIES.md is generated from
// coverage in the default (flag-off) state, so enabling
// this flag in a build that runs the docs test requires
// regenerating that snapshot for the sleeve row.
export function sleevePreviewEnabled(): boolean {
  if (sleeveOverride !== null) return sleeveOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SLEEVE_PREVIEW === "1"
}

export function setSleevePreviewForTests(value: boolean | null): void {
  sleeveOverride = value
}

let snaplockOverride: boolean | null = null

// Gates the snap-lock box 3D preview (batch T22 Part 2),
// behind its own flag, default off: while off, the
// snap_lock_box coverage is exactly the pre-T22
// behaviour; while on, coverage reports the "snaplock"
// family and getBoxModel renders SnapLockBox. Same
// snapshot coupling as the sleeve flag.
export function snaplockPreviewEnabled(): boolean {
  if (snaplockOverride !== null) return snaplockOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SNAPLOCK_PREVIEW === "1"
}

export function setSnaplockPreviewForTests(value: boolean | null): void {
  snaplockOverride = value
}

let autobottomOverride: boolean | null = null

// Gates the auto-bottom box 3D preview (batch T24,
// continuing the T22 list), behind its own flag,
// default off: while off, the auto_bottom_box coverage
// is exactly the pre-T24 behaviour; while on, coverage
// reports the "autobottom" family and getBoxModel
// renders AutoBottomBox. Same snapshot coupling as
// the sleeve and snap-lock flags.
export function autobottomPreviewEnabled(): boolean {
  if (autobottomOverride !== null) return autobottomOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_AUTOBOTTOM_PREVIEW === "1"
}

export function setAutobottomPreviewForTests(value: boolean | null): void {
  autobottomOverride = value
}

let pillowOverride: boolean | null = null

// Gates the pillow box 3D preview (batch T24,
// continuing the T22 list), behind its own flag,
// default off: while off, the pillow_box coverage is
// exactly the pre-T24 behaviour; while on, coverage
// reports the "pillow" family and getBoxModel renders
// PillowBox. Same snapshot coupling as the other
// preview flags.
export function pillowPreviewEnabled(): boolean {
  if (pillowOverride !== null) return pillowOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_PILLOW_PREVIEW === "1"
}

export function setPillowPreviewForTests(value: boolean | null): void {
  pillowOverride = value
}

let rigidVariantsOverride: boolean | null = null

// Gates the rigid-variant 3D previews (batch T25):
// the five rigid products that have no route today
// (rigid_jewellery_box, rigid_cosmetic_box,
// rigid_wine_box, rigid_flower_box, rigid_shirt_box)
// are routed to the existing "rigid" family and its
// RigidBox model while the flag is on. Default off:
// while off, their coverage is exactly the pre-T25
// behaviour. Same snapshot coupling as the other
// preview flags.
export function rigidVariantsPreviewEnabled(): boolean {
  if (rigidVariantsOverride !== null) return rigidVariantsOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_RIGID_VARIANTS_PREVIEW === "1"
}

export function setRigidVariantsPreviewForTests(value: boolean | null): void {
  rigidVariantsOverride = value
}

let stripOverride: boolean | null = null

// Gates the strip 3D previews (batch T25) — paper
// tape, plastic tape, water-activated tape and
// ribbon, which have no preview family today — behind
// their own flag, default off: while off, their
// coverage is exactly the pre-T25 behaviour; while on,
// coverage reports the "strip" family and getBoxModel
// renders StripRoll. Same snapshot coupling as the
// other preview flags.
export function stripPreviewEnabled(): boolean {
  if (stripOverride !== null) return stripOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_STRIP_PREVIEW === "1"
}

export function setStripPreviewForTests(value: boolean | null): void {
  stripOverride = value
}

let sewnbagOverride: boolean | null = null

// Gates the sewn-bag 3D previews (batch T25) —
// cotton, mesh and muslin bags, which have no preview
// family today — behind their own flag, default off:
// while off, their coverage is exactly the pre-T25
// behaviour; while on, coverage reports the "sewnbag"
// family and getBoxModel renders SewnBag. Same
// snapshot coupling as the other preview flags.
export function sewnbagPreviewEnabled(): boolean {
  if (sewnbagOverride !== null) return sewnbagOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SEWNBAG_PREVIEW === "1"
}

export function setSewnbagPreviewForTests(value: boolean | null): void {
  sewnbagOverride = value
}

let mailerVariantsOverride: boolean | null = null

// Gates the mailer-variant 3D previews (batch T25):
// ecommerce_mailer_box and christmas_gift_box, which
// have no route today, are routed to the existing
// "mailer" family and its MailerBox model while the
// flag is on. Default off. Same snapshot coupling as
// the other preview flags.
export function mailerVariantsPreviewEnabled(): boolean {
  if (mailerVariantsOverride !== null) return mailerVariantsOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MAILER_VARIANTS_PREVIEW === "1"
}

export function setMailerVariantsPreviewForTests(value: boolean | null): void {
  mailerVariantsOverride = value
}

let magneticRigidOverride: boolean | null = null

// Gates the magnetic rigid 3D previews (batch T25):
// rigid_magnetic_box, rigid_magnetic_cosmetic_box
// and rigid_magnetic_wine_box, which have no route
// today, are routed to the existing "rigid" family
// and its RigidBox model while the flag is on. The
// preview shows the rigid box form; the magnetic
// closure is internal and is not modelled. Default
// off. Same snapshot coupling as the other flags.
export function magneticRigidPreviewEnabled(): boolean {
  if (magneticRigidOverride !== null) return magneticRigidOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_MAGNETIC_RIGID_PREVIEW === "1"
}

export function setMagneticRigidPreviewForTests(value: boolean | null): void {
  magneticRigidOverride = value
}

let footprintOverride: boolean | null = null

// Gates the stamp ink pad 3D preview (batch T25) —
// the last uncovered product — behind its own flag,
// default off: while off, its coverage is exactly the
// pre-T25 behaviour; while on, coverage reports the
// "footprint" family and getBoxModel renders
// StampPad. Same snapshot coupling as the other
// preview flags.
export function footprintPreviewEnabled(): boolean {
  if (footprintOverride !== null) return footprintOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_FOOTPRINT_PREVIEW === "1"
}

export function setFootprintPreviewForTests(value: boolean | null): void {
  footprintOverride = value
}

let bottleboxOverride: boolean | null = null

// Gates the bottle box 3D preview (batch T26): its
// dieline construction is the snap-lock one, so while
// this flag is on, coverage routes bottle_box to the
// existing "snaplock" family and its SnapLockBox
// model. It has its own flag — the T22 snap-lock flag
// continues to cover snap_lock_box only. Default
// off. Same snapshot coupling as the other flags.
export function bottleboxPreviewEnabled(): boolean {
  if (bottleboxOverride !== null) return bottleboxOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BOTTLEBOX_PREVIEW === "1"
}

export function setBottleboxPreviewForTests(value: boolean | null): void {
  bottleboxOverride = value
}

let corrugatedUnroutedOverride: boolean | null = null

// Batch T26 addendum: corrugated_envelope's preview
// route and its dieline construction disagree — the
// preview routes it to the "envelope" family while
// its dieline type is "pocket" (see the T25 note).
// This flag runs the note's smallest change: while
// it is ON, coverage treats corrugated_envelope as
// unrouted, so its preview is honestly unavailable
// and the editor stops offering the envelope opening
// control for it. The dieline is untouched. Unlike
// the other flags in this file, ON means a route is
// removed, not added. Default off — with the flag
// off, the shipped route stays exactly as it is, and
// whether the product's construction is envelope or
// pocket remains a product decision. Same snapshot
// coupling: with the flag on, the snapshot's
// corrugated_envelope row changes envelope -> none.
export function corrugatedEnvelopeUnrouted(): boolean {
  if (corrugatedUnroutedOverride !== null) return corrugatedUnroutedOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CORRUGATED_ENVELOPE_UNROUTED === "1"
}

export function setCorrugatedEnvelopeUnroutedForTests(value: boolean | null): void {
  corrugatedUnroutedOverride = value
}
