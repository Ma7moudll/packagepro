"use client"

import { Template, TemplateRating, TemplateSearchFilters, TemplateSearchResult } from "@/lib/editor/types/template"
import { DesignCoreState } from "@/lib/editor/state/types"
import { apiGet, apiPost, apiPatch, apiDelete, ApiClientError } from "@/lib/api/client"
import type { Template as BackendTemplate } from "@shared/types"
import { slugify, toEditorTemplate, loadTemplateIntoEditor } from "./template-mapping"

export { loadTemplateIntoEditor }

/**
 * Template service — talks to the real backend template module
 * (GET/POST /api/templates...), not the legacy in-memory mock under
 * app/api/packagepro/*, which loses every template on restart.
 *
 * Shape differences between the backend Template and the editor Template:
 * - backend stores the design payload as `designData`; the editor calls it `designState`
 * - backend has no slug: a template's id acts as its slug
 * - backend has no style/ratings fields yet (see the notes on each function)
 */

/**
 * Create a new template from the current design.
 * NOTE: template authoring is an ADMIN capability on the backend
 * (POST /api/templates requires the admin role); a non-admin caller gets 403.
 */
export async function createTemplate(data: {
  name: string
  description: string
  category: Template["category"]
  style: Template["style"]
  tags: string[]
  designState: DesignCoreState
  thumbnailDataUrl?: string
}): Promise<Template> {
  const res = await apiPost<BackendTemplate>("/templates", {
    name: data.name,
    description: data.description,
    category: data.category,
    thumbnail: data.thumbnailDataUrl ?? "",
    designData: { designState: data.designState },
    tags: data.tags,
    isPublic: true,
  })
  if (!res.data) throw new Error("Failed to create template")
  return toEditorTemplate(res.data)
}

/**
 * Get template by ID
 */
export async function getTemplate(id: string): Promise<Template> {
  const res = await apiGet<BackendTemplate>(`/templates/${id}`)
  if (!res.data) throw new Error("Template not found")
  return toEditorTemplate(res.data)
}

/**
 * Get template by slug. The backend has no slug column: the id acts as the
 * slug. As a convenience for older name-based links, fall back to a name
 * search when the slug is not an id.
 */
export async function getTemplateBySlug(slug: string): Promise<Template> {
  try {
    return await getTemplate(slug)
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.status !== 404) throw error
  }

  const res = await apiGet<BackendTemplate[]>("/templates", { search: slug.replace(/-/g, " ") })
  const match = (res.data ?? []).find((t) => slugify(t.name) === slug)
  if (!match) throw new Error("Template not found")
  return toEditorTemplate(match)
}

/**
 * Search templates. The backend list endpoint filters but does not paginate,
 * so paging is applied client-side over the filtered result.
 */
export async function searchTemplates(
  filters: TemplateSearchFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<TemplateSearchResult> {
  const query: Record<string, string> = {}
  if (filters.category) query.category = filters.category
  if (filters.searchQuery) query.search = filters.searchQuery

  const res = await apiGet<BackendTemplate[]>("/templates", query)
  let templates = (res.data ?? []).map(toEditorTemplate)

  if (filters.style) {
    templates = templates.filter((t) => t.style === filters.style)
  }
  if (filters.tags && filters.tags.length > 0) {
    templates = templates.filter((t) => filters.tags!.some((tag) => t.tags.includes(tag)))
  }

  const start = (page - 1) * pageSize
  return {
    templates: templates.slice(start, start + pageSize),
    total: templates.length,
    page,
    pageSize,
  }
}

/**
 * Get popular templates
 */
export async function getPopularTemplates(limit: number = 10): Promise<Template[]> {
  const res = await apiGet<BackendTemplate[]>("/templates/popular", { limit: String(limit) })
  return (res.data ?? []).map(toEditorTemplate)
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(
  category: Template["category"],
  limit: number = 20
): Promise<Template[]> {
  return searchTemplates({ category }, 1, limit).then((result) => result.templates)
}

/**
 * Update template (admin-only on the backend)
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Pick<Template, "name" | "description" | "category" | "style" | "tags" | "isPublic" | "designState">>
): Promise<Template> {
  const body: Record<string, unknown> = {}
  if (updates.name !== undefined) body.name = updates.name
  if (updates.description !== undefined) body.description = updates.description
  if (updates.category !== undefined) body.category = updates.category
  if (updates.tags !== undefined) body.tags = updates.tags
  if (updates.isPublic !== undefined) body.isPublic = updates.isPublic
  if (updates.designState !== undefined) body.designData = { designState: updates.designState }

  const res = await apiPatch<BackendTemplate>(`/templates/${id}`, body)
  if (!res.data) throw new Error("Failed to update template")
  return toEditorTemplate(res.data)
}

/**
 * Delete template (admin-only on the backend)
 */
export async function deleteTemplate(id: string): Promise<void> {
  await apiDelete(`/templates/${id}`)
}

/**
 * Template ratings are not implemented in the backend template module yet.
 * Return an empty list so detail pages render instead of failing.
 */
export async function getTemplateRatings(_templateId: string): Promise<TemplateRating[]> {
  return []
}

/**
 * Template ratings are not implemented in the backend template module yet.
 */
export async function addTemplateRating(
  _templateId: string,
  _rating: number,
  _comment?: string
): Promise<TemplateRating> {
  throw new Error("Template ratings are not available yet")
}
