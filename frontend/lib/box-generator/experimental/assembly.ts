import { generateExperimentalSleeve, foldExperimentalSleeve, type SleeveInput, type Point3 } from "./sleeve.ts"

export interface AssemblyInput {
  /** Existing Mailer renderer reference dimensions, not measured filled-pack OD. */
  mailerMm: { length: number; width: number; height: number }
  sleeve: SleeveInput
  slideAxis: "length" | "width"
}
export const ASSEMBLY_WARNINGS = [
  "EXPERIMENTAL ASSEMBLY LAB. Not the standard artwork editor or a supported catalogue product.",
  "Mailer dimensions are renderer references, NOT measured filled-pack outside dimensions.",
  "Sleeve dimensions are independent score-to-score inputs. No automatic fit or caliper compensation.",
  "Nominal gaps and axial separation are mathematical references, NOT collision, friction or fit approval.",
  "Mailer board thickness is illustrative. Sleeve surfaces have zero thickness; its caliper is recorded only.",
  "No pricing, checkout, saved design, artwork mapping or factory export. Manufacturer sample required.",
] as const

export function generateExperimentalAssembly(input: AssemblyInput) {
  if (input.slideAxis !== "length" && input.slideAxis !== "width") throw new RangeError("choose length or width slide axis")
  for (const key of ["length", "width", "height"] as const) {
    const value = input.mailerMm[key]
    if (typeof value !== "number" || !Number.isFinite(value) || value < 20 || value > 1000) throw new RangeError("Mailer renderer dimensions must be 20–1000 mm")
  }
  const sleeve = generateExperimentalSleeve(input.sleeve)
  const mailerMm = { ...input.mailerMm }
  const crossMm = input.slideAxis === "length" ? mailerMm.width : mailerMm.length
  const axialMm = input.slideAxis === "length" ? mailerMm.length : mailerMm.width
  const nominalGapMm = { horizontal: sleeve.dimensions.length - crossMm, vertical: sleeve.dimensions.width - mailerMm.height }
  // This is animation staging, not a physical clearance formula. At full
  // removal the nearest sleeve edge is one entire band-depth past the box.
  const removalTravelMm = (axialMm + sleeve.dimensions.height) / 2 + sleeve.dimensions.height
  return {
    kind: "experimental-mailer-sleeve-assembly" as const,
    productionApproved: false as const, fitApproved: false as const,
    mailerMm, sleeve, slideAxis: input.slideAxis, nominalGapMm, axialMm, removalTravelMm,
    nominalOverlap: nominalGapMm.horizontal <= 0 || nominalGapMm.vertical <= 0,
    warnings: ASSEMBLY_WARNINGS,
  }
}
export type ExperimentalAssembly = ReturnType<typeof generateExperimentalAssembly>

export function experimentalAssemblyPose(assembly: ExperimentalAssembly, removal: number, requestedOpen: number) {
  for (const p of [removal, requestedOpen]) if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) throw new RangeError("pose progress must be 0–1")
  const offsetMm = removal * assembly.removalTravelMm
  const axialSeparationMm = offsetMm - (assembly.axialMm + assembly.sleeve.dimensions.height) / 2
  // Deliberate UI sequence, not a physical collision solver. A partly removed
  // sleeve always holds the lid shut, even if nominal intervals have separated.
  const actualOpen = removal === 1 ? requestedOpen : 0
  return {
    offsetMm, axialSeparationMm, actualOpen, lidBlocked: removal !== 1,
    panels: foldExperimentalSleeve(assembly.sleeve, 1).map(panel => ({
      id: panel.id,
      points: panel.points.map((point): Point3 => {
        const across = point.x - assembly.sleeve.dimensions.length / 2
        const y = assembly.mailerMm.height / 2 + assembly.sleeve.dimensions.width / 2 - point.z
        const along = point.y - assembly.sleeve.dimensions.height / 2 + offsetMm
        return assembly.slideAxis === "length" ? { x: along, y, z: across } : { x: across, y, z: along }
      }),
    })),
  }
}
