// M8-J — Certified dieline delivery contract (pure, "use client"-free).
//
// This module is the delivery layer ON TOP of the canonical M8-C/M8-G pipeline:
//
//   Editor state -> product.dieline + model.dimensions
//                 -> resolveDieline            (single resolution point)
//                 -> DielineGeometry           (canonical geometry)
//                 -> serializeSVG              (sole SVG authority)
//                 -> M8-I certification gate   (this module)
//                 -> deterministic delivery    (this module)
//
// It owns NO geometry and NO prepress logic. It consumes an already-resolved
// canonical geometry and an already-persisted M8-I result and answers one
// question: may this exact artifact be delivered, and under what name? Nothing
// here recomputes panels, edges, paths or px/mm — the only serialization is the
// canonical `serializeSVG(geometry)` call.
//
// Pure module (no DOM / fetch): unit-tested with the Node test runner.

import { resolveDieline } from "../geometry/resolve-dieline.ts"
import { serializeSVG } from "./dieline-service.ts"
import type {
  DielineBlueprint,
  DielineGeometry,
} from "../../../../shared/types/index.ts"

export type CertificationStatus =
  | "CERTIFIED"
  | "UNVERIFIABLE"
  | "FAILED"
  | "NOT_CERTIFIED"

export interface PrePressIssueLike {
  type?: string
  severity?: string
  message?: string
}

export interface PrePressResultLike {
  passed?: boolean
  checkedAt?: string | Date | null
  issues?: PrePressIssueLike[] | null
}

export interface CertificationAssessment {
  status: CertificationStatus
  reason: string
  detail?: string
}

export interface DielineDeliveryInput {
  /** Canonical resolved geometry (output of the single resolution point). */
  geometry?: DielineGeometry | null
  /** Only used for the deterministic file name fallback. */
  boxType?: string
  assessment: CertificationAssessment
  /** echo of the M8-I checkedAt for the delivered receipt. */
  checkedAt?: string | null
}

export type DielineDelivery =
  | {
      status: "delivered"
      svg: string
      fileName: string
      bytes: number
      certification: { status: "CERTIFIED"; checkedAt: string | null; reason: string }
    }
  | {
      status: "blocked_certification"
      fileName: string
      certification: CertificationAssessment
    }
  | {
      status: "unavailable"
      reason: string
    }
  | {
      status: "error"
      message: string
    }

/**
 * M8-I demotes every UNVERIFIABLE verdict to a warning — it never fakes a pass
 * and never hard-fails an unmeasurable file. A delivery therefore treats any
 * UNVERIFIABLE outcome as: cannot be certified.
 */
export function isUnverifiable(result: PrePressResultLike | null | undefined): boolean {
  return !!result?.issues?.some((i) => /unverifiable/i.test(i.message ?? ""))
}

/** A certification is current iff it covers this exact artifact and is fresh. */
export function assessCertification(
  result: PrePressResultLike | null | undefined,
  coversArtifact: boolean,
  designUpdatedAt?: string | Date | null
): CertificationAssessment {
  if (!result) {
    return {
      status: "NOT_CERTIFIED",
      reason: "No prepress certification is on record for this design.",
    }
  }

  const checkedAt = result.checkedAt ? new Date(result.checkedAt) : null
  const updatedAt = designUpdatedAt ? new Date(designUpdatedAt) : null
  const stale = !!checkedAt && !!updatedAt && updatedAt.getTime() > checkedAt.getTime()

  if (!coversArtifact || stale) {
    return {
      status: "NOT_CERTIFIED",
      reason:
        "Certification is stale — the dieline to be delivered no longer matches the certified snapshot.",
      detail: coversArtifact
        ? `design.updatedAt (${updatedAt?.toISOString()}) is newer than checkedAt (${checkedAt?.toISOString()})`
        : "The live dieline bytes differ from the certified snapshot. Re-run the prepress check.",
    }
  }

  if (result.passed === false) {
    return {
      status: "FAILED",
      reason: "Prepress certification failed — delivery is blocked.",
    }
  }

  if (isUnverifiable(result)) {
    return {
      status: "UNVERIFIABLE",
      reason: "Prepress results are unverifiable — this delivery cannot be certified.",
    }
  }

  return {
    status: "CERTIFIED",
    reason: "The delivered dieline matches the certified prepress snapshot.",
  }
}

/** Deterministic dieline export file name (mm SVG). Never a timestamp/UUID. */
export function dielineExportFileName(boxType?: string): string {
  const slug =
    (boxType ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "dieline"
  return `dieline-${slug}.svg`
}

/** The ONLY serialization this module may perform — delegates to serializeSVG. */
export function canonicalSvg(geometry: DielineGeometry): string {
  return serializeSVG(geometry)
}

/** Exact byte-identity between two canonical serializations. */
export function artifactsMatch(a: string, b: string): boolean {
  return a === b
}

/** Resolution-point dims shape accepted by resolveDieline (mm). */
export interface DielineDims {
  length: number
  width: number
  height: number
}

/**
 * Resolve geometry through the single canonical resolution point. The saved
 * M8-H snapshot (`manifest.dieline`) is preferred when present; else the
 * persisted blueprint + dimensions are resolved — never any math here.
 */
export function canonicalPersistedGeometry(args: {
  snapshot?: DielineGeometry | null
  blueprint?: DielineBlueprint | null
  dims?: DielineDims | null
}): DielineGeometry | null {
  if (args.snapshot) return args.snapshot
  if (!args.blueprint || !args.dims) return null
  const resolution = resolveDieline(args.blueprint, args.dims)
  return resolution.ok ? resolution.geometry : null
}

/** Resolve the LIVE editor geometry through the same canonical resolution point. */
export function canonicalLiveGeometry(args: {
  blueprint?: DielineBlueprint | null
  dims?: DielineDims | null
}): DielineGeometry | null {
  if (!args.blueprint || !args.dims) return null
  const resolution = resolveDieline(args.blueprint, args.dims)
  return resolution.ok ? resolution.geometry : null
}

/**
 * Assemble an explicit export result. Delivery only happens when the M8-I gate
 * is CERTIFIED; anything else returns a blocked/unavailable/error result and
 * never a payload. Pure and side-effect free.
 */
export function assembleDielineDelivery(input: DielineDeliveryInput): DielineDelivery {
  const { geometry, boxType, assessment, checkedAt } = input

  if (assessment.status !== "CERTIFIED") {
    return {
      status: "blocked_certification",
      fileName: dielineExportFileName(boxType),
      certification: assessment,
    }
  }

  if (!geometry) {
    return {
      status: "unavailable",
      reason: "No resolved dieline geometry is available to export.",
    }
  }

  try {
    const svg = canonicalSvg(geometry)
    const fileName = dielineExportFileName(geometry.boxType ?? boxType)
    const bytes = new TextEncoder().encode(svg).length
    return {
      status: "delivered",
      svg,
      fileName,
      bytes,
      certification: {
        status: "CERTIFIED",
        checkedAt: checkedAt ?? null,
        reason: assessment.reason,
      },
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown export error",
    }
  }
}