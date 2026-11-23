// Shared output boundary for two-face sheet designs (the business card)
// that carry artwork on inside faces. The truth is derived from the saved
// design data itself — the layers' faceIds against the sheet's faces —
// never from the optional manifest flag alone: a saved design whose flag
// was stripped (or never written) must still refuse outputs that would
// silently omit the inside artwork or fabricate inside plates for it.

export interface UnsupportedArtwork {
  faces: string[];
  layerCount: number;
}

const SHEET_FACE_IDS = ['front', 'back', 'inside_front', 'inside_back'] as const;

export function deriveUnsupportedArtwork(designData: unknown): UnsupportedArtwork | undefined {
  const d = (designData ?? {}) as {
    model?: { faces?: Array<{ id?: unknown }> };
    layers?: Array<{ faceId?: unknown }>;
    manifest?: { unsupportedArtwork?: { faces?: string[]; layerCount?: number } };
  };

  const faces = Array.isArray(d?.model?.faces) ? d.model.faces : [];
  const ids = [...new Set(faces.map((f) => String(f?.id ?? '')))];
  const outside = ids.filter((id) => !id.startsWith('inside_'));
  const isSheet =
    outside.length === 2 &&
    outside.includes('front') &&
    outside.includes('back') &&
    ids.every((id) => (SHEET_FACE_IDS as readonly string[]).includes(id));

  if (isSheet) {
    const layers = Array.isArray(d?.layers) ? d.layers : [];
    const inside = layers.filter((l) => l?.faceId === 'inside_front' || l?.faceId === 'inside_back');
    if (inside.length > 0) {
      return {
        faces: [...new Set(inside.map((l) => String(l.faceId)))].sort(),
        layerCount: inside.length,
      };
    }
    return undefined;
  }

  // Not a sheet by structure: fall back to the manifest flag if one was
  // persisted, so a flagged design is never treated as clean.
  const flag = d?.manifest?.unsupportedArtwork;
  if (flag && (flag.layerCount ?? 0) > 0) {
    return { faces: flag.faces ?? [], layerCount: flag.layerCount ?? 0 };
  }
  return undefined;
}

/** The same honest, recoverable wording the frontend boundary uses. */
export function unsupportedArtworkOutputMessage(unsupported: UnsupportedArtwork): string {
  return `This card design has ${unsupported.layerCount} artwork layer(s) on inside faces (${unsupported.faces.join(', ')}), which this preview does not support. The artwork is preserved in the design and the design still saves, but every design output is blocked until you move or remove that artwork: PDF, SVG, PNG and JPEG export, the current-face PNG reference, the artwork review download, certified export and proof generation.`;
}
