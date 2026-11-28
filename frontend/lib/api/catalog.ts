import { apiGet, apiPost } from './client'
import type {
  CatalogCategory,
  CatalogProductDetail,
  CatalogQuote,
  CatalogQuoteRequest,
  EditorConfig,
} from '@shared/types'

export const catalogApi = {
  list: () => apiGet<CatalogCategory[]>('/catalog'),

  detail: (slug: string) =>
    apiGet<CatalogProductDetail>(`/catalog/${encodeURIComponent(slug)}`),

  quote: (slug: string, body: CatalogQuoteRequest) =>
    apiPost<CatalogQuote>(`/catalog/${encodeURIComponent(slug)}/quote`, body),

  getEditorConfig: (slug: string, quantity?: number) =>
    apiGet<EditorConfig>(`/catalog/${encodeURIComponent(slug)}/editor-config`, quantity===undefined?undefined:{ quantity: String(quantity) }),
}
