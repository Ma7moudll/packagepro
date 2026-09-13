import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { catalogService } from './catalog.service';

/**
 * M8-J (spec §14): product-coverage completion & closure.
 *
 * Read-only integration test over the seeded catalogue. Guarantees:
 *  - all four M8-required products (mailer + folding-carton + shipping-box +
 *    rigid-box + pizza-box) return canonical blueprints end-to-end;
 *  - the three deferrable products (paper-bag, poly-mailer, label) carry
 *    `support: "deferred"` with a reason and NEVER a blueprint;
 *  - the coverage matrix is internally consistent for EVERY seeded product
 *    (supported → dieline present; deferred → no dieline, never fake geometry).
 */
const SUPPORTED = [
  { slug: 'custom-mailer-box', boxType: 'mailer-box', dims: { length: 115, width: 70, height: 38 } },
  { slug: 'custom-product-box', boxType: 'folding-carton', dims: { length: 150, width: 100, height: 50 } },
  { slug: 'custom-shipping-box', boxType: 'shipping-box', dims: { length: 400, width: 300, height: 250 } },
  { slug: 'custom-rigid-box', boxType: 'rigid-box', dims: { length: 250, width: 180, height: 60 } },
  { slug: 'custom-pizza-box', boxType: 'pizza-box', dims: { length: 330, width: 330, height: 45 } },
] as const;

const DEFERRED = [
  { slug: 'custom-paper-bag' },
  { slug: 'custom-poly-mailer' },
  { slug: 'custom-label-sticker' },
] as const;

const FACE_IDS = [
  'front', 'back', 'left', 'right', 'top', 'bottom',
  'inside_front', 'inside_back', 'inside_left', 'inside_right',
  'inside_top', 'inside_bottom',
];
const LINE_CLASSES = ['cut', 'fold', 'score', 'glue', 'perf'];

/** facePanel mapping (M8-C, strict): front/back = L×H, top/bottom = L×W, left/right = W×H, inside_* = outer sibling. */
function expectedPanelSize(faceId: string, dims: { length: number; width: number; height: number }) {
  const outside: Record<string, [number, number]> = {
    front: [dims.length, dims.height],
    back: [dims.length, dims.height],
    left: [dims.width, dims.height],
    right: [dims.width, dims.height],
    top: [dims.length, dims.width],
    bottom: [dims.length, dims.width],
  };
  const id = faceId.startsWith('inside_') ? faceId.slice('inside_'.length) : faceId;
  return outside[id] ?? outside.front;
}

describe('catalog editor-config — M8-J product coverage matrix', () => {
  beforeAll(async () => {
    const count = await prisma.product.count();
    if (count === 0) {
      throw new Error('Catalogue empty — run "npm run prisma:seed" first');
    }
  });

  it('every M8-required box product returns a canonical blueprint', async () => {
    for (const { slug, boxType, dims } of SUPPORTED) {
      const cfg = await catalogService.getEditorConfig(slug, 100);
      expect(cfg.product.slug, slug).toBe(slug);
      expect(cfg.product.support, slug).toBe('supported');
      expect(cfg.product.boxType, slug).toBe(boxType);
      expect(cfg.product.schemaVersion, slug).toBe(1);
      expect(cfg.product.unit, slug).toBe('mm');

      const dieline = cfg.product.dieline as any;
      expect(dieline, `dieline missing for ${slug}`).toBeTruthy();
      expect(dieline.schemaVersion).toBe(1);
      expect(dieline.boxType, slug).toBe(boxType);

      // Every canonical FaceId has a panel sized by the strict facePanel mapping.
      for (const faceId of FACE_IDS) {
        const panel = dieline.panels?.[faceId];
        expect(panel, `${slug}: panel missing for ${faceId}`).toBeTruthy();
        const [w, h] = expectedPanelSize(faceId, dims);
        expect(panel.w).toBe(w);
        expect(panel.h).toBe(h);
      }

      // Stack flush: outline encloses every declared panel.
      const maxX = Math.max(...FACE_IDS.map((id) => dieline.panels[id].x + dieline.panels[id].w));
      const maxY = Math.max(...FACE_IDS.map((id) => dieline.panels[id].y + dieline.panels[id].h));
      expect(maxX, `${slug} outline x`).toBeLessThanOrEqual(dieline.outline.w);
      expect(maxY, `${slug} outline y`).toBeLessThanOrEqual(dieline.outline.h);

      // Per-edge LineClass whitelist + valid adjacency targets (spec §8).
      for (const faceId of FACE_IDS) {
        const edges = dieline.panels[faceId].edges ?? {};
        for (const edge of Object.values(edges) as any[]) {
          expect(LINE_CLASSES).toContain(edge.class);
          if (edge.to !== undefined) {
            expect([...FACE_IDS, 'glue_flap', 'none']).toContain(edge.to);
          }
        }
      }

      // prepress baseline present.
      expect(cfg.product.prepress?.fluteType, slug).toBeTruthy();
      expect(typeof cfg.product.prepress?.caliperMm).toBe('number');
    }
  });

  it('deferrable products are explicitly deferred with zero blueprint fields', async () => {
    for (const { slug } of DEFERRED) {
      const cfg = await catalogService.getEditorConfig(slug, 100);
      expect(cfg.product.slug).toBe(slug);
      expect(cfg.product.support, slug).toBe('deferred');
      expect(cfg.product.supportReason, slug).toBeTruthy();
      expect(cfg.product.schemaVersion, slug).toBeUndefined();
      expect(cfg.product.unit, slug).toBeUndefined();
      expect(cfg.product.dieline, slug).toBeUndefined();
      expect(cfg.product.prepress, slug).toBeUndefined();
    }
  });

  it('coverage matrix is consistent for every seeded product (no fake geometry)', async () => {
    const products = await prisma.product.findMany({ select: { slug: true, editorDefaults: true } });
    expect(products.length).toBeGreaterThanOrEqual(8);

    for (const p of products) {
      const ed = (p.editorDefaults as any) ?? {};
      // Every M8 product must carry an explicit support verdict.
      expect(['supported', 'deferred'], p.slug).toContain(ed.support);
      if (ed.support === 'supported') {
        expect(ed.dieline, `${p.slug}: supported products must carry a blueprint`).toBeTruthy();
        expect(ed.dieline.schemaVersion).toBe(1);
      } else {
        expect(ed.dieline, `${p.slug}: deferred products must NEVER carry a blueprint`).toBeUndefined();
        expect(ed.supportReason).toBeTruthy();
      }
    }
  });
});