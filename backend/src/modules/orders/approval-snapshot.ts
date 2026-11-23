import { createHash } from "crypto";

/** Versioned, conservative content identity. Only explicitly display-only
 * editor fields are excluded. Unknown authored fields remain binding. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export function approvalContentHash(design: {
  designData?: unknown;
  productId?: unknown;
  variantId?: unknown;
  sku?: unknown;
  designConfig?: unknown;
}): string {
  const data = {
    ...(design.designData &&
    typeof design.designData === "object" &&
    !Array.isArray(design.designData)
      ? (design.designData as Record<string, unknown>)
      : { value: design.designData ?? null }),
  };
  for (const field of [
    "camera",
    "ui",
    "selectedLayerIds",
    "activeTool",
    "history",
  ])
    delete data[field];
  return createHash("sha256")
    .update(
      JSON.stringify(
        canonical({
          version: 1,
          data,
          productId: design.productId ?? null,
          variantId: design.variantId ?? null,
          sku: design.sku ?? null,
          designConfig: design.designConfig ?? null,
        }),
      ),
    )
    .digest("hex");
}
export const approvalBytesHash = (bytes: Buffer): string =>
  createHash("sha256").update(bytes).digest("hex");
