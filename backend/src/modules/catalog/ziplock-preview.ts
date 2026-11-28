/** Frosted ziplock bag preview contract (preview only — the product's
 * dieline stays deferred and its pricing quote_required; nothing here is
 * a production, film-gauge or seal specification).
 *
 * The bag is a flat two-film construction: a front and a back sheet with
 * a resealable zip strip near the top. The renderer maps artwork only to
 * the front and back faces, so — exactly like the stand-up pouch
 * contract — artwork saved on any other surface is preserved in the
 * design data but blocks design outputs until it is removed, instead of
 * being silently omitted from a proof or export. */

/** Illustrative frosted-film stock colour, not a supplier colour or a
 * film specification. Mirrors the loyalty/thank-you preview hooks. */
export function ziplockPreviewStockColour(type: string, material: string): string | undefined {
  return type.replace(/-/g, '_') === 'frosted_ziplock_bag' && material === 'plastic-frosted' ? '#e9ebeb' : undefined
}

/** Two full film faces only. The width axis is the preview's film
 * separation coordinate, not a certified bag gusset or gauge. */
export function ziplockPreviewStructure(dimensions: { length: number; width: number; height: number }) {
  if (!Object.values(dimensions).every((v) => Number.isFinite(v) && v > 0)) throw new Error('Invalid ziplock preview dimensions')
  const { length, width, height } = dimensions
  return {
    type: 'flat',
    brand: 'PackagePro',
    boxType: 'frosted-ziplock-bag',
    defaultSizes: [{ code: 'default', label: 'Frosted Ziplock Bag', dims: { ...dimensions } }],
    faces: {
      front: { width: length, height, depth: width, label: 'Front' },
      back: { width: length, height, depth: width, label: 'Back' },
    },
    zones: { front: [], back: [] },
  }
}

/** The ziplock renderer maps artwork only to the front and back film
 * faces. This is a preview/output safety boundary, not a production
 * surface spec. */
export function unsupportedZiplockArtwork(type: unknown, layers: readonly { faceId?: unknown }[] | undefined) {
  if (typeof type !== 'string' || type.replace(/-/g, '_') !== 'frosted_ziplock_bag' || !layers) return null
  // Match legacy applyCoreState migration: absent/falsy faceId belongs to front.
  // Explicit unsupported IDs are never normalized away.
  const unsupported = layers.filter((l) => { const face = l?.faceId || 'front'; return face !== 'front' && face !== 'back' })
  if (!unsupported.length) return null
  return { faces: [...new Set(unsupported.map((l) => String(l?.faceId ?? 'missing')))].sort(), layerCount: unsupported.length, product: 'frosted_ziplock_bag' as const }
}

export function unsupportedZiplockOutputMessage(unsupported: { faces: string[]; layerCount: number }) {
  return `This frosted ziplock bag design has ${unsupported.layerCount} artwork layer(s) on surfaces (${unsupported.faces.join(', ')}) that the current preview does not represent. Only front and back artwork are mapped, and the preview is a reference preview only. All artwork remains saved. Open the warning Details to review the saved layer names and surfaces, select a layer in Properties, or explicitly confirm deletion. Undo restores a deleted layer and the output block. PDF, SVG, PNG and JPEG export, the current-face PNG reference, new artwork review creation, certified export and proof generation remain blocked while unsupported artwork exists. No production surface specification is implied.`
}
