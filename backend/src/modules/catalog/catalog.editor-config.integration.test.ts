import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { catalogService } from './catalog.service';

/**
 * M8-B: Integration test — canonical editor-config blueprint passthrough.
 * Read only, no writes. Depends on the idempotent seed (prod-mailer-box =
 * full M8-B vertical; prod-paper-bag = M8-J explicit deferral = no blueprint).
 */
const MAILER_SLUG = 'custom-mailer-box';
// M8-J (spec §14): deferred product — support:deferred, NO blueprint fields.
const DEFERRED_SLUG = 'custom-paper-bag';
const FACE_IDS = [
  'front', 'back', 'left', 'right', 'top', 'bottom',
  'inside_front', 'inside_back', 'inside_left', 'inside_right',
  'inside_top', 'inside_bottom',
];
const LINE_CLASSES = ['cut', 'fold', 'score', 'glue', 'perf'];

describe('catalog getEditorConfig — M8-B blueprint passthrough', () => {
  beforeAll(async () => {
    // Guard: the test asserts on seeded data. Fail fast with a clear message
    // if the vertical is absent instead of silently passing.
    const mailer = await prisma.product.findUnique({ where: { slug: MAILER_SLUG } });
    if (!mailer) {
      throw new Error(`Seed missing "${MAILER_SLUG}" — run "npm run prisma:seed" first`);
    }
  });

  it('returns the mailer blueprint additively (schemaVersion, unit, dieline, prepress)', async () => {
    const cfg = await catalogService.getEditorConfig(MAILER_SLUG, 50);

    // M7 contract must be untouched.
    expect(cfg.product.id).toBe('prod-mailer-box');
    expect(cfg.product.slug).toBe(MAILER_SLUG);
    expect(cfg.variant.dimensions).toEqual({ length: 115, width: 70, height: 38, unit: 'mm' });

    // M8-B: additive blueprint fields.
    expect(cfg.product.schemaVersion).toBe(1);
    expect(cfg.product.unit).toBe('mm');

    const dieline = cfg.product.dieline as any;
    expect(dieline).toBeTruthy();
    expect(dieline.schemaVersion).toBe(1);
    expect(dieline.boxType).toBe('mailer-box');
    expect(dieline.faceOrder).toEqual(['left', 'front', 'right', 'back', 'top', 'bottom']);

    // Every canonical FaceId has a panel; dims match the F42 invariant.
    for (const faceId of FACE_IDS) {
      const panel = dieline.panels?.[faceId];
      expect(panel, `panel missing for ${faceId}`).toBeTruthy();
      expect(panel.faceId).toBe(faceId);
    }
    expect(dieline.panels.front).toMatchObject({ w: 115, h: 38 });
    expect(dieline.panels.left).toMatchObject({ w: 70, h: 38 });
    expect(dieline.panels.top).toMatchObject({ w: 115, h: 70 });
    expect(dieline.panels.bottom).toMatchObject({ w: 115, h: 70 });
    expect(dieline.outline).toEqual({ w: 370, h: 178 });

    // Stack flush: outline encloses every declared panel.
    const maxX = Math.max(...FACE_IDS.map((id) => dieline.panels[id].x + dieline.panels[id].w));
    const maxY = Math.max(...FACE_IDS.map((id) => dieline.panels[id].y + dieline.panels[id].h));
    expect(maxX).toBeLessThanOrEqual(dieline.outline.w);
    expect(maxY).toBeLessThanOrEqual(dieline.outline.h);

    // Per-edge LineClass whitelist + valid fold/glue adjacency targets.
    for (const faceId of FACE_IDS) {
      const edges = dieline.panels[faceId].edges ?? {};
      for (const edge of Object.values(edges) as any[]) {
        expect(LINE_CLASSES).toContain(edge.class);
        if (edge.to !== undefined) {
          expect([...FACE_IDS, 'glue_flap', 'none']).toContain(edge.to);
        }
      }
    }

    // Fold adjacency is expressed on shared edges (front↔top, front↔bottom).
    const frontEdges = dieline.panels.front.edges;
    expect(frontEdges.top).toEqual({ class: 'fold', to: 'top' });
    expect(frontEdges.bottom).toEqual({ class: 'fold', to: 'bottom' });

    // prepress metadata.
    expect(cfg.product.prepress).toEqual({ caliperMm: 0.5, fluteType: 'E', glueFlapToleranceMm: 1.5 });
  });

  it('returns no blueprint fields for deferred products (M8-J, support:deferred)', async () => {
    const cfg = await catalogService.getEditorConfig(DEFERRED_SLUG, 50);

    expect(cfg.product.slug).toBe(DEFERRED_SLUG);
    // M8-J: explicit deferral flag, with a human reason, and NO blueprint.
    expect(cfg.product.support).toBe('deferred');
    expect(cfg.product.supportReason).toBeTruthy();
    expect(cfg.product.schemaVersion).toBeUndefined();
    expect(cfg.product.unit).toBeUndefined();
    expect(cfg.product.dieline).toBeUndefined();
    expect(cfg.product.prepress).toBeUndefined();
    // Additive only: the existing M7 editorDefaults blob fallback is untouched
    // (paper-bag carries editorDefaults without a `structure` key, so the
    // M7 `editorDefaults?.structure ?? editorDefaults` fallback applies).
    expect(cfg.product.structure).toBeTruthy();
  });

  it('flags M8-required products as supported (mailer vertical)', async () => {
    const cfg = await catalogService.getEditorConfig(MAILER_SLUG, 50);
    expect(cfg.product.support).toBe('supported');
    expect(cfg.product.supportReason).toBeUndefined();
  });
});