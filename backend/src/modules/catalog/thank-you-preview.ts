/** Illustrative editor surface colors, not supplier stock/color specifications. */
export function thankYouPreviewStockColour(type: string, material: string): string | undefined {
  if (type.replace(/-/g, '_') !== 'thank_you_card') return undefined
  return material === 'card-stock-white' ? '#e9ecef' : material === 'card-stock-kraft' ? '#a8855a' : undefined
}

/** Two printable sides of the listed sheet, never a production blueprint.
 * The width axis is the existing preview coordinate, not a caliper claim. */
export function thankYouPreviewStructure(dimensions: {length: number; width: number; height: number}) {
  const {length, width, height} = dimensions
  if (![length, width, height].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid sheet preview dimensions')
  return {
    type: 'flat', brand: 'PackagePro', boxType: 'thank-you-card',
    defaultSizes: [{code: 'default', label: 'Thank You Card', dims: {...dimensions}}],
    faces: {
      front: {width: length, height, depth: width, label: 'Front'},
      back: {width: length, height, depth: width, label: 'Back'},
    },
    zones: {front: [], back: []},
  }
}
