import { describe, it, expect } from 'vitest';
import { dielineOverlaySegments } from './proof-generator';

// Proof dieline overlay placement (PR65 audit fix). Dieline paths persist
// in flat-net millimetres (absolute, Y down); a proof plate is one face's
// trim area in PDF orientation (Y up). The overlay must translate by the
// panel's net origin and flip Y inside the panel — before this fix it
// plotted net coordinates directly on the plate, displacing every line
// by the panel's position in the layout and mirroring it vertically.

const FRONT_PANEL = { x: 70, y: 70, w: 115, h: 38 }; // mailer F42 front panel in the net

describe('dielineOverlaySegments', () => {
  it('maps the panel top edge to the plate top (Y flipped) and left edge to x=0', () => {
    const segments = dielineOverlaySegments(FRONT_PANEL, 'front', [
      { id: 'front-top', faceId: 'front', class: 'fold', points: [{ x: 70, y: 70 }, { x: 185, y: 70 }] },
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ x1: 0, y1: 38, x2: 115, y2: 38 });
  });

  it('maps the panel bottom edge to the plate bottom (y=0)', () => {
    const segments = dielineOverlaySegments(FRONT_PANEL, 'front', [
      { id: 'front-bottom', faceId: 'front', class: 'fold', points: [{ x: 70, y: 108 }, { x: 185, y: 108 }] },
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ x1: 0, y1: 0, x2: 115, y2: 0 });
  });

  it('chains multi-point paths into consecutive segments', () => {
    const segments = dielineOverlaySegments(FRONT_PANEL, 'front', [
      {
        id: 'front-outline', faceId: 'front', class: 'cut',
        points: [{ x: 70, y: 70 }, { x: 185, y: 70 }, { x: 185, y: 108 }],
      },
    ]);
    expect(segments).toHaveLength(2);
    expect(segments[1]).toMatchObject({ x1: 115, y1: 38, x2: 115, y2: 0 });
  });

  it('keeps only the requested face\'s paths', () => {
    const segments = dielineOverlaySegments(FRONT_PANEL, 'front', [
      { id: 'back-top', faceId: 'back', class: 'cut', points: [{ x: 255, y: 70 }, { x: 370, y: 70 }] },
      { id: 'front-top', faceId: 'front', class: 'fold', points: [{ x: 70, y: 70 }, { x: 185, y: 70 }] },
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0].path.id).toBe('front-top');
  });

  it('returns no segments without the panel — misplaced lines are worse than none', () => {
    expect(
      dielineOverlaySegments(undefined, 'front', [
        { id: 'front-top', faceId: 'front', class: 'cut', points: [{ x: 70, y: 70 }, { x: 185, y: 70 }] },
      ])
    ).toEqual([]);
    expect(dielineOverlaySegments(FRONT_PANEL, 'front', undefined)).toEqual([]);
    expect(dielineOverlaySegments(FRONT_PANEL, 'front', [])).toEqual([]);
  });
});
