// Output boundary for two-face sheet designs carrying inside-face artwork.
// The backend must derive the truth from the saved layers and structure —
// never from the optional manifest flag alone. A saved card whose flag was
// stripped (or never written) but whose inside artwork layers remain must
// still refuse a proof; boxes and clean cards are unaffected.

import { describe, it, expect } from 'vitest';
import { deriveUnsupportedArtwork } from './unsupported-artwork';
import { composeProofPdf, readManifest } from './proof-generator';

const sheetFaces = [
  { id: 'front', name: 'Front' },
  { id: 'back', name: 'Back' },
  { id: 'inside_front', name: 'Inside Front' },
  { id: 'inside_back', name: 'Inside Back' },
];
const insideLayer = { id: 'inside-art', faceId: 'inside_front' };
const frontLayer = { id: 'front-art', faceId: 'front' };

// A saved v2 envelope for the card with NO unsupportedArtwork flag in the
// manifest — the flag-absent case from the owner's runtime confirmation.
const flaglessCardData = {
  schemaVersion: 2,
  manifest: {
    product: { id: 'prod-business-card', slug: 'custom-business-card', boxType: 'business-card' },
    faces: { front: { w: 85, h: 55 }, back: { w: 85, h: 55 } },
    // note: no unsupportedArtwork flag
  },
  model: { faces: sheetFaces, printCoverage: 'both', dimensions: { length: 85, width: 1, height: 55 } },
  layers: [frontLayer, insideLayer],
};

describe('deriveUnsupportedArtwork (data-derived, flag-independent)', () => {
  it('derives the block from saved layers + structure when the flag is absent', () => {
    expect(deriveUnsupportedArtwork(flaglessCardData)).toEqual({ faces: ['inside_front'], layerCount: 1 });
  });

  it('returns undefined for a clean card (sheet faces, no inside layers)', () => {
    expect(
      deriveUnsupportedArtwork({ ...flaglessCardData, layers: [frontLayer] })
    ).toBeUndefined();
  });

  it('returns undefined for a box with inside-face layers (not a sheet)', () => {
    const boxFaces = ['front', 'back', 'left', 'right', 'top', 'bottom', 'inside_front', 'inside_back'].map(
      (id) => ({ id, name: id })
    );
    expect(
      deriveUnsupportedArtwork({
        manifest: { faces: {} },
        model: { faces: boxFaces, printCoverage: 'both' },
        layers: [insideLayer],
      })
    ).toBeUndefined();
  });

  it('still honors a persisted manifest flag when the structure is not a sheet', () => {
    expect(
      deriveUnsupportedArtwork({
        manifest: { unsupportedArtwork: { faces: ['inside_front'], layerCount: 2 } },
        model: { faces: [], printCoverage: 'outside' },
        layers: [],
      })
    ).toEqual({ faces: ['inside_front'], layerCount: 2 });
  });
});

describe('proof boundary', () => {
  const pngBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64),
  ]);

  it('readManifest derives unsupportedArtwork from the saved data, flag absent', () => {
    const manifest = readManifest(flaglessCardData);
    expect(manifest.unsupportedArtwork).toEqual({ faces: ['inside_front'], layerCount: 1 });
  });

  it('composeProofPdf refuses the flag-absent card instead of silently omitting the inside artwork', async () => {
    const manifest = readManifest(flaglessCardData);
    await expect(
      composeProofPdf(pngBuffer, { orderNumber: 'TEST-1', items: [], manifest })
    ).rejects.toThrow(/Proof blocked: .*inside faces \(inside_front\)/);
  });

  it('composeProofPdf does not block a normal box manifest', async () => {
    const manifest = readManifest({
      manifest: { faces: { front: { w: 115, h: 38 } } },
      model: {
        faces: ['front', 'back', 'left', 'right', 'top', 'bottom'].map((id) => ({ id, name: id })),
        printCoverage: 'outside',
      },
      layers: [frontLayer],
    });
    expect(manifest.unsupportedArtwork).toBeUndefined();
    const outcome = await composeProofPdf(pngBuffer, {
      orderNumber: 'TEST-2',
      items: [],
      manifest,
    }).then(
      () => 'resolved',
      (error: Error) => error.message
    );
    expect(outcome).not.toMatch(/Proof blocked/);
  });
});

describe('malformed duplicate sheet faces', () => {
  it('does not let duplicate outside face entries bypass the output guard', () => {
    expect(deriveUnsupportedArtwork({model:{faces:[{id:'front'},{id:'front'},{id:'back'}]},layers:[{faceId:'inside_front'}]})).toEqual({faces:['inside_front'],layerCount:1});
  });
});
