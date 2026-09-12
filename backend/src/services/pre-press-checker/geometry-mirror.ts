// M8-I — Authoritative geometry evaluation; an exact backend mirror of the
// M8-F frontend algebra (frontend/lib/editor/services/print-validation.ts).
//
// AMENDMENT 4: the FE is the lighter UX mirror; THIS module is the production
// authority, run against the persisted design manifest + editor layer state.
// Bounds/trim are mm; layer positions are canvas px converted via PX_PER_MM.
// Same physical constants and the same semantic contract as the frontend.

export const PX_PER_MM = 3;
export const BLEED_MM = 3;
export const SAFE_MM = 5;
export const ZONE_MATCH_TOLERANCE_MM = 5; // mirror parity; not asserted by M8-I
export const STACKED_OVERLAP_MIN_COVERAGE = 0.95;
export const AUTOFIX_MIN_BLEED_RATIO = 0.6;

export interface MirrorLayer {
  id?: string;
  faceId?: string;
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  width?: number;
  height?: number;
}

export interface MmBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type CheckSeverity = 'error' | 'warning' | 'info';

export interface GeometryIssue {
  type: 'bleed' | 'safe' | 'overlap' | 'geometry';
  severity: CheckSeverity;
  message: string;
  elementId?: string;
  faceId?: string;
}

export interface AutoFix {
  type: string;
  action: string;
  elementId?: string;
  faceId?: string;
  detail?: string;
}

export interface GeometryAnalysis {
  issues: GeometryIssue[];
  fixedAutomatically: AutoFix[];
  bleedMarginsOk: boolean;
  safeZoneOk: boolean;
}

/**
 * Layer bounding box in mm relative to its face top-left. `width`/`height`
 * are the canvas logical px extent; position + scale are the stored state.
 * Mirrors `layerBoundsMm` on the FE.
 */
export function layerBoundsMm(layer: MirrorLayer): MmBounds {
  const pxLeft = layer.position?.x ?? 0;
  const pxTop = layer.position?.y ?? 0;
  const pxWidth = (layer.width ?? 0) * (layer.scale?.x ?? 1);
  const pxHeight = (layer.height ?? 0) * (layer.scale?.y ?? 1);
  return {
    left: pxLeft / PX_PER_MM,
    top: pxTop / PX_PER_MM,
    right: (pxLeft + pxWidth) / PX_PER_MM,
    bottom: (pxTop + pxHeight) / PX_PER_MM,
  };
}

/**
 * An element passes bleed when EVERY side near the trim edge (within
 * `bleedMm`) extends at least `bleedMm` beyond it. Deep-interior edges are
 * unrestricted. Mirrors `checkElementExtendsBeyondBleed` on the FE.
 */
export function checkElementExtendsBeyondBleed(
  bounds: MmBounds,
  trimW: number,
  trimH: number,
  bleedMm: number = BLEED_MM
): boolean {
  const gapLeft = bounds.left;
  const gapRight = trimW - bounds.right;
  const gapTop = bounds.top;
  const gapBottom = trimH - bounds.bottom;
  if (gapLeft <= bleedMm && bounds.left > -bleedMm) return false;
  if (gapRight <= bleedMm && bounds.right - trimW < bleedMm) return false;
  if (gapTop <= bleedMm && bounds.top > -bleedMm) return false;
  if (gapBottom <= bleedMm && bounds.bottom - trimH < bleedMm) return false;
  return true;
}

/**
 * An element is inside the safe area only when every edge lies strictly more
 * than `safeMm` inside the trim (an edge exactly on the safe line fails).
 * Mirrors `checkElementWithinSafeArea` on the FE.
 */
export function checkElementWithinSafeArea(
  bounds: MmBounds,
  trimW: number,
  trimH: number,
  safeMm: number = SAFE_MM
): boolean {
  return (
    bounds.left > safeMm &&
    bounds.right < trimW - safeMm &&
    bounds.top > safeMm &&
    bounds.bottom < trimH - safeMm
  );
}

/** True when any pair of mm bounds intersects strictly (touching edges pass). */
export function checkForOverlaps(boundsList: MmBounds[]): boolean {
  for (let i = 0; i < boundsList.length; i++) {
    for (let j = i + 1; j < boundsList.length; j++) {
      const a = boundsList[i];
      const b = boundsList[j];
      if (
        a.left < b.right &&
        b.left < a.right &&
        a.top < b.bottom &&
        b.top < a.bottom
      ) {
        return true;
      }
    }
  }
  return false;
}

function overlapAreaMm(a: MmBounds, b: MmBounds): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

function areaMm(b: MmBounds): number {
  return Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface BleedEdgeVerdict {
  ok: boolean;
  edge?: string;
  extension?: number;
  severity?: 'error' | 'warning';
}

/**
 * Per-edge bleed verdict for elements adjacent to the trim. Shortfalls within
 * [AUTOFIX_MIN_BLEED_RATIO, 1) of the required bleed are auto-fixable: the
 * proof renders the edge extended to the bleed line (never mutating files).
 */
function bleedEdgeIssue(
  bounds: MmBounds,
  trimW: number,
  trimH: number,
  bleedMm: number
): BleedEdgeVerdict {
  const edges = [
    { key: 'left', gap: bounds.left, ext: -bounds.left },
    { key: 'right', gap: trimW - bounds.right, ext: bounds.right - trimW },
    { key: 'top', gap: bounds.top, ext: -bounds.top },
    { key: 'bottom', gap: trimH - bounds.bottom, ext: bounds.bottom - trimH },
  ];
  let worst: BleedEdgeVerdict = { ok: true };
  let best: { key: string; ext: number } | null = null;
  for (const edge of edges) {
    if (edge.gap <= bleedMm && edge.ext < bleedMm) {
      const band = edge.ext >= bleedMm * AUTOFIX_MIN_BLEED_RATIO;
      const candidate: BleedEdgeVerdict = {
        ok: false,
        edge: edge.key,
        extension: edge.ext,
        severity: band ? 'warning' : 'error',
      };
      if (
        worst.ok ||
        (candidate.severity === 'error' && worst.severity !== 'error') ||
        (!best || edge.ext > best.ext)
      ) {
        worst = candidate;
        best = { key: edge.key, ext: edge.ext };
      }
    }
  }
  return worst;
}

/**
 * Evaluate bleed/safe/overlap against the persisted manifest faces + layer
 * state. `inside_*` faces resolve through their outer sibling (FE `facePanel`
 * semantics). Returns typed issues plus any auto-fixes applied at proof time.
 */
export function analyzeGeometry(
  faces: Record<string, { w: number; h: number }> | undefined,
  layers: MirrorLayer[] | undefined,
  prepress?: { bleedMm?: number; safeMm?: number }
): GeometryAnalysis {
  const issues: GeometryIssue[] = [];
  const fixedAutomatically: AutoFix[] = [];
  const list = Array.isArray(layers) ? layers.filter((l) => l && typeof l === 'object') : [];

  if (!faces || Object.keys(faces).length === 0) {
    if (list.length > 0) {
      issues.push({
        type: 'geometry',
        severity: 'warning',
        message:
          'No geometry manifest available; bleed/safe/overlap checks were skipped',
      });
    }
    return { issues, fixedAutomatically, bleedMarginsOk: true, safeZoneOk: true };
  }

  const bleedMm = prepress?.bleedMm ?? BLEED_MM;
  const safeMm = prepress?.safeMm ?? SAFE_MM;

  const grouped = new Map<string, MirrorLayer[]>();
  for (const layer of list) {
    const raw = layer.faceId ?? '';
    const upper = raw.startsWith('inside_') ? raw.slice('inside_'.length) : raw;
    const faceId = faces[upper] ? upper : faces[raw] ? raw : '';
    if (!faceId) {
      issues.push({
        type: 'geometry',
        severity: 'warning',
        message: `Element references unknown face "${raw}"`,
        elementId: layer.id,
        faceId: raw,
      });
      continue;
    }
    const arr = grouped.get(faceId) ?? [];
    arr.push(layer);
    grouped.set(faceId, arr);
  }

  for (const [faceId, faceLayers] of grouped) {
    const dim = faces[faceId];
    const trimW = Number(dim?.w) || 0;
    const trimH = Number(dim?.h) || 0;
    if (trimW <= 0 || trimH <= 0) {
      issues.push({
        type: 'geometry',
        severity: 'warning',
        message: `Face "${faceId}" has no valid dimensions`,
        faceId,
      });
      continue;
    }

    const boundsList: MmBounds[] = [];
    let stackedReported = false;

    for (const layer of faceLayers) {
      const bounds = layerBoundsMm(layer);

      // A zero-extent element (no stored size) is a point marker, not print
      // geometry — it cannot extend bleed, violate the safe area, or overlap.
      if (bounds.right - bounds.left <= 0.0001 || bounds.bottom - bounds.top <= 0.0001) {
        continue;
      }

      const verdict = bleedEdgeIssue(bounds, trimW, trimH, bleedMm);
      if (!verdict.ok) {
        const id = layer.id ?? 'layer';
        if (verdict.severity === 'error') {
          issues.push({
            type: 'bleed',
            severity: 'error',
            message: `Element "${id}" does not extend ${bleedMm}mm beyond the trim (${verdict.edge} edge ${round2(
              verdict.extension ?? 0
            )}mm)`,
            elementId: layer.id,
            faceId,
          });
        } else {
          issues.push({
            type: 'bleed',
            severity: 'warning',
            message: `Element "${id}" has ${round2(
              verdict.extension ?? 0
            )}mm bleed on the ${verdict.edge} edge; proof will extend it to ${bleedMm}mm`,
            elementId: layer.id,
            faceId,
          });
          fixedAutomatically.push({
            type: 'bleed',
            action: 'extend_to_bleed',
            elementId: layer.id,
            faceId,
            detail: `Proof renders the ${verdict.edge} edge extended to ${bleedMm}mm bleed (measured ${round2(
              verdict.extension ?? 0
            )}mm)`,
          });
        }
      }

      if (!checkElementWithinSafeArea(bounds, trimW, trimH, safeMm)) {
        issues.push({
          type: 'safe',
          severity: 'warning',
          message: `Element "${layer.id ?? 'layer'}" crosses the ${safeMm}mm safe-area line`,
          elementId: layer.id,
          faceId,
        });
      }

      boundsList.push(bounds);
    }

    if (checkForOverlaps(boundsList)) {
      issues.push({
        type: 'overlap',
        severity: 'info',
        message: 'Two or more elements overlap',
        faceId,
      });
    }
    for (let i = 0; i < boundsList.length && !stackedReported; i++) {
      for (let j = i + 1; j < boundsList.length; j++) {
        const a = boundsList[i];
        const b = boundsList[j];
        const cov = overlapAreaMm(a, b) / Math.max(areaMm(a), areaMm(b), 1e-9);
        if (cov >= STACKED_OVERLAP_MIN_COVERAGE) {
          issues.push({
            type: 'overlap',
            severity: 'error',
            message: `Element "${faceLayers[i].id ?? i}" and "${faceLayers[j].id ?? j}" fully overlap (stacked full-bleed layers)`,
            elementId: faceLayers[j].id,
            faceId,
          });
          stackedReported = true;
          break;
        }
      }
    }
  }

  return {
    issues,
    fixedAutomatically,
    bleedMarginsOk: !issues.some((i) => i.type === 'bleed' && i.severity === 'error'),
    safeZoneOk: !issues.some((i) => i.type === 'safe'),
  };
}