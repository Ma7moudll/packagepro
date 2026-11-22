/**
 * Join between the editor product picker (products-data.ts) and the unified
 * storefront/backend catalogue (shared/catalog/products.ts).
 *
 * The canonical id IS the picker ProductType, so the join is by identity —
 * this file only exposes lookups and a coverage check, it does not redefine
 * any product data. Preview geometry routing stays with the rendering
 * owner's product-preview-coverage.ts; both normalize ids to kebab-case
 * (`boxType` here), so the two registries join on that key.
 */
import {
  CATALOGUE_PRODUCTS,
  CATALOGUE_PRODUCT_COUNT,
  getCatalogueProduct,
  type CatalogueProduct,
} from "../../../../shared/catalog/products.ts"
import type { ProductType } from "../state/types"

export function getCatalogEntryForProductType(type: ProductType): CatalogueProduct | undefined {
  return getCatalogueProduct(type)
}

export function getCatalogEntryForSlug(slug: string): CatalogueProduct | undefined {
  return CATALOGUE_PRODUCTS.find((p) => p.slug === slug)
}

/**
 * Every picker product id must have exactly one catalogue entry, and vice
 * versa. Takes the picker ids as input so the check runs in plain node
 * (products-data.ts is a client module). Returns mismatches (empty = unified).
 */
export function catalogueMappingMismatches(pickerIds: string[]): string[] {
  const problems: string[] = []
  const catalogueIds = new Set(CATALOGUE_PRODUCTS.map((p) => p.id))
  const pickerIdSet = new Set(pickerIds)

  for (const id of pickerIdSet) {
    if (!catalogueIds.has(id)) problems.push(`picker product "${id}" missing from catalogue registry`)
  }
  for (const id of catalogueIds) {
    if (!pickerIdSet.has(id)) problems.push(`catalogue product "${id}" missing from editor picker`)
  }
  if (pickerIds.length !== CATALOGUE_PRODUCT_COUNT) {
    problems.push(`picker count ${pickerIds.length} != catalogue count ${CATALOGUE_PRODUCT_COUNT}`)
  }
  return problems
}
