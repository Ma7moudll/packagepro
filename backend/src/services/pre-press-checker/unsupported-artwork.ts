import {unsupportedStandUpPouchArtwork,unsupportedPouchOutputMessage} from '../../modules/catalog/pouch-preview-contract';
import {unsupportedZiplockArtwork,unsupportedZiplockOutputMessage} from '../../modules/catalog/ziplock-preview';
// Shared output boundary for two-face sheet designs (the business card)
// that carry artwork on inside faces. The truth is derived from the saved
// design data itself — the layers' faceIds against the sheet's faces —
// never from the optional manifest flag alone: a saved design whose flag
// was stripped (or never written) must still refuse outputs that would
// silently omit the inside artwork or fabricate inside plates for it.

export interface UnsupportedArtwork {
  faces: string[];
  layerCount: number;
  product?: 'stand_up_pouch' | 'frosted_ziplock_bag';
}

const SHEET_FACE_IDS = ['front', 'back', 'inside_front', 'inside_back'] as const;

export function deriveUnsupportedArtwork(designData: unknown): UnsupportedArtwork | undefined {
  const d = (designData ?? {}) as {
    model?: { type?:unknown; faces?: Array<{ id?: unknown }> };
    product?: {id?:unknown;boxType?:unknown};
    layers?: Array<{ faceId?: unknown }>;
    manifest?: { product?:{id?:unknown;boxType?:unknown}; unsupportedArtwork?: { faces?: string[]; layerCount?: number; product?:'stand_up_pouch' | 'frosted_ziplock_bag' } };
  };

  const pouch=unsupportedStandUpPouchArtwork(d.model?.type,Array.isArray(d.layers)?d.layers:undefined)
    ??unsupportedStandUpPouchArtwork(d.product?.boxType,Array.isArray(d.layers)?d.layers:undefined)
    ??unsupportedStandUpPouchArtwork(d.product?.id==='prod-stand-up-pouch'?'stand_up_pouch':undefined,Array.isArray(d.layers)?d.layers:undefined);
  if(pouch)return pouch;
  const manifestPouch=unsupportedStandUpPouchArtwork(d.manifest?.product?.boxType,Array.isArray(d.layers)?d.layers:undefined)??unsupportedStandUpPouchArtwork(d.manifest?.product?.id==='prod-stand-up-pouch'?'stand_up_pouch':undefined,Array.isArray(d.layers)?d.layers:undefined);
  if(manifestPouch)return manifestPouch;

  const ziplock=unsupportedZiplockArtwork(d.model?.type,Array.isArray(d.layers)?d.layers:undefined)
    ??unsupportedZiplockArtwork(d.product?.boxType,Array.isArray(d.layers)?d.layers:undefined)
    ??unsupportedZiplockArtwork(d.product?.id==='prod-frosted-ziplock-bag'?'frosted_ziplock_bag':undefined,Array.isArray(d.layers)?d.layers:undefined);
  if(ziplock)return ziplock;
  const manifestZiplock=unsupportedZiplockArtwork(d.manifest?.product?.boxType,Array.isArray(d.layers)?d.layers:undefined)??unsupportedZiplockArtwork(d.manifest?.product?.id==='prod-frosted-ziplock-bag'?'frosted_ziplock_bag':undefined,Array.isArray(d.layers)?d.layers:undefined);
  if(manifestZiplock)return manifestZiplock;

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
    return { faces: flag.faces ?? [], layerCount: flag.layerCount ?? 0,...(flag.product==='stand_up_pouch'||flag.product==='frosted_ziplock_bag'?{product:flag.product}:{}) };
  }
  return undefined;
}

/** The same honest, recoverable wording the frontend boundary uses. */
export function unsupportedArtworkOutputMessage(unsupported: UnsupportedArtwork): string {
  if(unsupported.product==='stand_up_pouch')return unsupportedPouchOutputMessage(unsupported);
  if(unsupported.product==='frosted_ziplock_bag')return unsupportedZiplockOutputMessage(unsupported);
  return `This card design has ${unsupported.layerCount} artwork layer(s) on inside faces (${unsupported.faces.join(', ')}), which this preview does not support. The artwork is preserved in the design and the design still saves, but every design output is blocked until you move or remove that artwork: PDF, SVG, PNG and JPEG export, the current-face PNG reference, the artwork review download, certified export and proof generation.`;
}
