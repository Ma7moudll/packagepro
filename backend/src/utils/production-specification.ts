import { ValidationError } from './errors';

export function hasUnpricedSpecification(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  const data = state as {model?: {type?:string; boardSpecification?: unknown; materialSpecification?: unknown}; layers?: Array<{raisedPrint?: unknown}>};
  // Only the original eight families have configured legacy estimates.
  // Unlinked snapshots for new/unknown products cannot use a generic box rate.
  const legacy=new Set(['mailer_box','folding_carton','shipping_box','rigid_box','pizza_box','paper_bag','poly_mailer_bag','rectangle_label','label','bag'])
  const type=data.model?.type?.replace(/-/g,'_')
  if(type&&!legacy.has(type))return true
  return data.model?.materialSpecification != null || data.model?.boardSpecification != null || Boolean(Array.isArray(data.layers) && data.layers.some(layer => layer?.raisedPrint != null));
}
export function assertSpecificationPriced(state: unknown): void {
  if (hasUnpricedSpecification(state)) throw new ValidationError('QUOTE_REQUIRED: Independent liner, coating, ink or selective relief specifications need an approved quote before ordering');
}
