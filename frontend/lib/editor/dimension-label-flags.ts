// Batch T25 — flag for the dimension-label relabels in
// product-configuration.ts. Default off: while off,
// every product's dimension labels are exactly the
// pre-T25 labels; while on, the products named in
// applyDimensionRelabels get labels that say what the
// field actually does on the routed dieline path
// (batch T24's size-field check). Labels only — no
// field is hidden, no value or mapping changes, and
// turning the flag off restores the old labels, so the
// change is reversible by configuration.
let dimensionLabelsOverride: boolean | null = null

export function dimensionLabelRelabelEnabled(): boolean {
  if (dimensionLabelsOverride !== null) return dimensionLabelsOverride
  return typeof process !== "undefined" && process.env?.NEXT_PUBLIC_DIMENSION_LABELS === "1"
}

export function setDimensionLabelRelabelForTests(value: boolean | null): void {
  dimensionLabelsOverride = value
}
