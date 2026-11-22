import type { CatalogProductDetail, CatalogQuote, CatalogQuoteRequest } from '../../../shared/types/index.ts'
import type { DesignCoreState, ColorVariant } from './state/types.ts'
import { editorRequiresQuote } from './quote-policy.ts'

export const PRINT_MODE_BY_COLOUR: Partial<Record<ColorVariant, string>> = {
  none: 'none', one_colour: 'mono', full_colour: 'full_color',
}
/** Only new preset initialization calls this. Saved explicit requests are not migrated. */
export function presetColourVariant(mode: string): ColorVariant | undefined {
  return (Object.entries(PRINT_MODE_BY_COLOUR).find(([, value]) => value === mode)?.[0]) as ColorVariant | undefined
}
export class PresetQuoteRequired extends Error {}
const requireQuote = (): never => { throw new PresetQuoteRequired('This configuration requires a quote; it does not match a supported preset.') }
const axes = ['length', 'width', 'height'] as const
function sameDimensions(mm: Record<string, any>, preset: Record<string, any>) {
  const factor = ({ mm: 1, cm: 10, inch: 25.4 } as Record<string, number>)[preset.unit]
  return !!factor && axes.every(axis => Number.isFinite(mm[axis]) && mm[axis] > 0 && Math.abs(mm[axis] - Number(preset[axis]) * factor) < 0.000001)
}
export interface PreparedPresetQuote {
  slug: string
  productId: string
  variantId: string
  sku: string
  body: CatalogQuoteRequest & { config: Record<string, string> }
}

/** Strict preset bridge, not a custom configuration resolver. Never fall back to generic pricing. */
export function preparePresetQuote(core: DesignCoreState, detail: CatalogProductDetail, quantity: number): PreparedPresetQuote {
  const { model, product, productConfig: selected } = core
  if (editorRequiresQuote(core) || model.type !== 'mailer_box' || !product || !selected?.variantId || !selected.sku) return requireQuote()
  if (detail.id !== product.id || detail.slug !== product.slug || detail.slug !== 'custom-mailer-box' || detail.readiness?.pricing === 'quote_required') return requireQuote()
  const variant = detail.variants.find(v => v.id === selected.variantId)
  if (!variant || variant.sku !== selected.sku || !sameDimensions(model.dimensions, variant.dimensions)) return requireQuote()
  if (selected.customDimensions && !sameDimensions(selected.customDimensions, { ...model.dimensions, unit: 'mm' })) return requireQuote()
  if (model.material !== variant.materialCode || (selected.selectedMaterial !== undefined && selected.selectedMaterial !== model.material)) return requireQuote()
  if (selected.selectedSize !== undefined && selected.selectedSize !== variant.sizeCode) return requireQuote()
  if (selected.selectedFinish !== undefined && selected.selectedFinish !== (variant.finish ?? 'none')) return requireQuote()
  if (PRINT_MODE_BY_COLOUR[model.colorVariant] !== variant.printMode || variant.printSides !== 'outside_only') return requireQuote()
  // The existing advanced controls do not map these requests to catalog options.
  // Keep them visible in model/saved data, but do not silently price the preset.
  if (model.finishing !== 'none' || model.lamination !== 'none' || model.adhesiveStrip !== 'none' || (model.fluteType !== undefined && model.fluteType !== 'E')) return requireQuote()
  if ((variant.finish ?? 'none') !== 'none') return requireQuote()
  const metadata = new Set(['selectedSize', 'selectedMaterial', 'selectedFinish', 'quantity', 'customDimensions', 'variantId', 'sku'])
  if (Object.entries(selected).some(([key, value]) => value !== undefined && !metadata.has(key))) return requireQuote()
  if (!Number.isInteger(quantity) || quantity < detail.moq) throw new Error('Quantity is below the preset minimum or is not a whole number.')
  const pinned: Record<string, string | undefined> = {
    size: variant.sizeCode ?? undefined, material: variant.materialCode ?? undefined,
    printColors: variant.printMode, printSides: variant.printSides, finish: variant.finish ?? 'none',
  }
  const config: Record<string, string> = {}
  for (const option of detail.options) {
    // Unknown option families need their own state contract, not a default guessed here.
    if (!(option.key in pinned)) return requireQuote()
    const value = pinned[option.key]
    if (value === undefined || !option.values.some(v => v.value === value)) return requireQuote()
    config[option.key] = value
  }
  // Pin economic identity even if the detail response omits optional controls.
  Object.entries(pinned).forEach(([key, value]) => { if (value !== undefined) config[key] = value })
  return { slug: product.slug, productId: product.id, variantId: variant.id, sku: variant.sku,
    body: { variantId: variant.id, quantity, dimensions: { ...model.dimensions, unit: 'mm' }, config } }
}
export function normalizePresetQuote(prepared: PreparedPresetQuote, data: CatalogQuote) {
  const { body } = prepared
  if (data.product.id !== prepared.productId || data.variant.id !== prepared.variantId || data.variant.sku !== prepared.sku ||
      data.quantity !== body.quantity || data.material.code !== body.config.material || !sameDimensions(body.dimensions!, data.variant.dimensions)) return requireQuote()
  for (const option of data.config) if (body.config[option.key] !== option.value) return requireQuote()
  const { total, subtotal, tax, shippingEstimate } = data.breakdown
  // Current cart summary adds tax after an already tax-inclusive item amount.
  // This bridge does not fix that separate server contract. Do not display a
  // parity estimate or enable this editor handoff when tax is nonzero.
  if (tax !== 0) return requireQuote()
  if (![total, subtotal, tax, shippingEstimate].every(n => Number.isFinite(n) && n >= 0) || data.material.currency !== 'EGP') throw new Error('Price unavailable')
  // Cart rounds merchandise separately and aggregates shipping in its summary.
  const merchandiseTotal = Math.round((subtotal + tax) * 100) / 100
  if (Math.round((merchandiseTotal + shippingEstimate) * 100) / 100 !== total) return requireQuote()
  return { ...data, totalPrice: total, total, unit: total / data.quantity, currency: data.material.currency,
    merchandiseTotal, merchandiseUnit: Math.round(merchandiseTotal / data.quantity * 100) / 100, prepared }
}
export type EditorPresetQuote = ReturnType<typeof normalizePresetQuote>
