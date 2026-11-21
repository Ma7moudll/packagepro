import { ValidationError } from './errors';

export function hasUnpricedSpecification(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  const data = state as {model?: {boardSpecification?: unknown}; layers?: Array<{raisedPrint?: unknown}>};
  return data.model?.boardSpecification != null || Boolean(Array.isArray(data.layers) && data.layers.some(layer => layer?.raisedPrint != null));
}
export function assertSpecificationPriced(state: unknown): void {
  if (hasUnpricedSpecification(state)) throw new ValidationError('QUOTE_REQUIRED: Independent liner, coating, ink or selective relief specifications need an approved quote before ordering');
}
