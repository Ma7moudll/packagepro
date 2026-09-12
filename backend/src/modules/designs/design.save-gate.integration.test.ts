import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { designService } from './design.service';
import { AppError } from '../../utils/errors';

/**
 * M8-H: Integration test — lifecycle save gate + versioned manifest persistence.
 * Exercises the service layer against the real Postgres (same convention as
 * auth.integration.test.ts / catalog.editor-config.integration.test.ts).
 *
 *   A  DRAFT session save succeeds and persists the v2 envelope (schemaVersion 2,
 *      manifestSource "blueprint", reproducibility "exact", manifest.faces).
 *   B  A SUBMITTED design rejects saves with a 400 lifecycle message (AC4) and
 *      its designData is left untouched.
 *   C  A manifest persists with zero export calls — manifest is independent of
 *      export (AMENDMENT 5, AC6).
 */
describe('design save — M8-H lifecycle gate + manifest persistence', () => {
  const sessions: string[] = [];

  beforeAll(async () => {
    await prisma.design.deleteMany({ where: { sessionId: { in: sessions } } });
  });

  afterAll(async () => {
    await prisma.design.deleteMany({ where: { sessionId: { in: sessions } } });
  });

  async function sessionId(name: string): Promise<string> {
    const { sessionId } = await designService.createSession({ name });
    sessions.push(sessionId);
    return sessionId;
  }

  /** Minimal v2 envelope in the exact shape the FE serializeDesignData produces. */
  function v2Envelope(sessionId: string) {
    return {
      schemaVersion: 2,
      manifestSource: 'blueprint',
      reproducibility: 'exact',
      manifest: {
        product: { id: 'prod-mailer-box', slug: 'custom-mailer-box', boxType: 'mailer-box' },
        variant: {
          id: 'variant-f42',
          sku: 'box--mailer-box--f42--cardboard-natural--print-monochrome--foil-none',
          dimensions: { length: 115, width: 70, height: 38, unit: 'mm' },
        },
        faces: {
          front: { w: 115, h: 38 },
          back: { w: 115, h: 38 },
          left: { w: 70, h: 38 },
          right: { w: 70, h: 38 },
          top: { w: 115, h: 70 },
          bottom: { w: 115, h: 70 },
        },
        zones: {},
        prepress: { bleedMm: 3, safeMm: 5, dpiMin: 300, caliperMm: 0.5, fluteType: 'E', glueFlapToleranceMm: 1.5 },
        dieline: { schemaVersion: 1, panels: {}, out: 'snapshot' },
      },
      // State body stays top-level (M7 artifact contract).
      canvas: { width: 460, height: 152 },
      layers: [{ id: 'l1', type: 'text', name: 'Label', faceId: 'front' }],
      product: { id: 'prod-mailer-box', slug: 'custom-mailer-box', name: 'Mailer Box', type: 'box' },
    };
  }

  it('A/C — DRAFT save persists the v2 manifest envelope (no export involved)', async () => {
    const sid = await sessionId('m8h-save-without-export');
    const envelope = v2Envelope(sid);

    const design = await designService.saveDesign({
      sessionId: sid,
      designData: envelope,
      productId: envelope.manifest.product.id,
      variantId: envelope.manifest.variant.id,
      sku: envelope.manifest.variant.sku,
    });

    expect(design.status).toBe('saved');
    expect(design.lifecycleStatus).toBe('DRAFT');

    // Persisted designData carries the v2 envelope + manifest (AC1/AC6).
    const persisted: any = design.designData;
    expect(persisted.schemaVersion).toBe(2);
    expect(persisted.manifestSource).toBe('blueprint');
    expect(persisted.reproducibility).toBe('exact');
    expect(persisted.manifest.faces.front).toEqual({ w: 115, h: 38 });
    expect(persisted.manifest.dieline).toBeTruthy();

    // M7 artifact contract untouched: layers/product stay top-level.
    expect(persisted.layers).toEqual([{ id: 'l1', type: 'text', name: 'Label', faceId: 'front' }]);
    expect(persisted.product.id).toBe('prod-mailer-box');
  });

  it('B — SUBMITTED session rejects saves (lifecycle gate, AC4) and data is untouched', async () => {
    const sid = await sessionId('m8h-gate-reject');
    const envelope = v2Envelope(sid);

    // Move the design out of DRAFT exactly as submitDesign would.
    const created = await designService.saveDesign({ sessionId: sid, designData: envelope });
    await prisma.design.update({
      where: { id: created.id },
      data: { lifecycleStatus: 'SUBMITTED' },
    });

    let error: unknown;
    try {
      await designService.saveDesign({ sessionId: sid, designData: { ...envelope, schemaVersion: 2 } });
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(400);
    expect((error as AppError).message).toContain('Cannot save design in SUBMITTED status');

    // designData untouched by the rejected save.
    const after = await prisma.design.findUnique({ where: { sessionId: sid } });
    const persisted: any = after?.designData;
    expect(persisted.schemaVersion).toBe(2);
    expect(persisted.layers[0].id).toBe('l1');
  });
});