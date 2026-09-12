import { describe, it, expect } from 'vitest';

/**
 * M8-B: Unit typeguard test for the canonical packaging blueprint
 * (M8_SPEC §7–§8). Pure — validates the DielineBlueprint contract shape
 * without a database: LineClass whitelist, 12-face panel coverage, valid
 * edge targets, sane outline — no path/bezier geometry (that's M8-C).
 */

type EdgeName = 'top' | 'right' | 'bottom' | 'left';
type LineClass = 'cut' | 'fold' | 'score' | 'glue' | 'perf';

const LINE_CLASSES: ReadonlyArray<LineClass> = ['cut', 'fold', 'score', 'glue', 'perf'];
const EDGE_NAMES: ReadonlyArray<EdgeName> = ['top', 'right', 'bottom', 'left'];
const FACE_IDS: ReadonlyArray<string> = [
  'front', 'back', 'left', 'right', 'top', 'bottom',
  'inside_front', 'inside_back', 'inside_left', 'inside_right',
  'inside_top', 'inside_bottom',
];

/** Minimal structural typeguard over an unknown-shaped blueprint (no imports). */
function isLineClass(v: unknown): v is LineClass {
  return typeof v === 'string' && (LINE_CLASSES as ReadonlyArray<string>).includes(v);
}

function isEdgeTarget(v: unknown): boolean {
  return typeof v === 'string' && (FACE_IDS.includes(v) || v === 'glue_flap' || v === 'none');
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isFaceId(v: unknown): v is string {
  return typeof v === 'string' && FACE_IDS.includes(v);
}

function isValidBlueprint(bp: unknown): bp is Record<string, any> {
  if (!bp || typeof bp !== 'object') return false;
  const b = bp as Record<string, any>;

  if (b.schemaVersion !== 1) return false;
  if (typeof b.boxType !== 'string' || b.boxType.length === 0) return false;
  if (!Array.isArray(b.faceOrder) || b.faceOrder.some((id) => !isFaceId(id))) return false;

  if (!b.panels || typeof b.panels !== 'object') return false;

  // Every canonical FaceId must be declared.
  for (const faceId of FACE_IDS) {
    const panel = b.panels[faceId];
    if (!panel || typeof panel !== 'object') return false;
    if (panel.faceId !== faceId) return false;
    if (!isNumber(panel.x) || !isNumber(panel.y) || !isNumber(panel.w) || !isNumber(panel.h)) return false;
    if (panel.w <= 0 || panel.h <= 0) return false;
    if (![0, 90, 180, 270].includes(panel.rotation)) return false;

    const edges = panel.edges ?? {};
    if (typeof edges !== 'object') return false;
    for (const edgeName of EDGE_NAMES) {
      const edge = edges[edgeName];
      if (edge === undefined) continue;
      if (!edge || typeof edge !== 'object') return false;
      if (!isLineClass(edge.class)) return false;
      if (edge.to !== undefined) {
        if (edge.to !== null && !isEdgeTarget(edge.to)) return false;
        if (edge.to === undefined) return false;
      }
    }
  }

  if (!b.outline || typeof b.outline !== 'object') return false;
  if (!isNumber(b.outline.w) || !isNumber(b.outline.h)) return false;
  if (b.outline.w <= 0 || b.outline.h <= 0) return false;

  return true;
}

/** A minimal valid F42 mailer blueprint fixture (mirrors seed template). */
const VALID_MAILER_BLUEPRINT = {
  schemaVersion: 1,
  boxType: 'mailer-box',
  faceOrder: ['left', 'front', 'right', 'back', 'top', 'bottom'],
  panels: {
    front: { faceId: 'front', x: 70, y: 70, w: 115, h: 38, rotation: 0, edges: { right: { class: 'fold', to: 'right' } } },
    back: { faceId: 'back', x: 255, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    left: { faceId: 'left', x: 0, y: 70, w: 70, h: 38, rotation: 0, edges: { right: { class: 'fold', to: 'front' } } },
    right: { faceId: 'right', x: 185, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    top: { faceId: 'top', x: 70, y: 0, w: 115, h: 70, rotation: 0, edges: { bottom: { class: 'fold', to: 'front' } } },
    bottom: { faceId: 'bottom', x: 70, y: 108, w: 115, h: 70, rotation: 0, edges: {} },
    inside_front: { faceId: 'inside_front', x: 70, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    inside_back: { faceId: 'inside_back', x: 255, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    inside_left: { faceId: 'inside_left', x: 0, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    inside_right: { faceId: 'inside_right', x: 185, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    inside_top: { faceId: 'inside_top', x: 70, y: 0, w: 115, h: 70, rotation: 0, edges: {} },
    inside_bottom: { faceId: 'inside_bottom', x: 70, y: 108, w: 115, h: 70, rotation: 0, edges: {} },
  },
  outline: { w: 370, h: 178 },
};

describe('DielineBlueprint typeguard (M8-B)', () => {
  it('accepts a valid mailer blueprint', () => {
    expect(isValidBlueprint(VALID_MAILER_BLUEPRINT)).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(isValidBlueprint(null)).toBe(false);
    expect(isValidBlueprint('dieline')).toBe(false);
    expect(isValidBlueprint(42)).toBe(false);
  });

  it('rejects missing schemaVersion', () => {
    const { schemaVersion, ...rest } = VALID_MAILER_BLUEPRINT;
    expect(isValidBlueprint(rest as any)).toBe(false);
  });

  it('rejects a LineClass outside the whitelist', () => {
    const bad = structuredClone(VALID_MAILER_BLUEPRINT);
    (bad.panels.front.edges as any).top = { class: 'magic', to: 'top' };
    expect(isValidBlueprint(bad)).toBe(false);
  });

  it('rejects an edge target that is not a FaceId/glue_flap/none', () => {
    const bad = structuredClone(VALID_MAILER_BLUEPRINT);
    (bad.panels.front.edges as any).right = { class: 'fold', to: 'not-a-face' };
    expect(isValidBlueprint(bad)).toBe(false);
  });

  it('rejects a missing canonical FaceId panel', () => {
    const bad = structuredClone(VALID_MAILER_BLUEPRINT);
    delete bad.panels.inside_top;
    expect(isValidBlueprint(bad)).toBe(false);
  });

  it('rejects a panel whose faceId key does not match its record key', () => {
    const bad = structuredClone(VALID_MAILER_BLUEPRINT);
    bad.panels.back.faceId = 'front';
    expect(isValidBlueprint(bad)).toBe(false);
  });

  it('rejects non-positive outline', () => {
    const bad = structuredClone(VALID_MAILER_BLUEPRINT);
    bad.outline.w = 0;
    expect(isValidBlueprint(bad)).toBe(false);
  });

  it('rejects panels keyed with unknown faceId in faceOrder', () => {
    const bad = structuredClone(VALID_MAILER_BLUEPRINT);
    bad.faceOrder = ['left', 'front', 'flap-xyz'];
    expect(isValidBlueprint(bad)).toBe(false);
  });
});