"use client"

import { Template, TemplateRating, TemplateSearchFilters, TemplateSearchResult } from "@/lib/editor/types/template"
import { DesignCoreState } from "@/lib/editor/state/types"

/**
 * Create a new template from current design
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
  const response = await fetch("/api/packagepro/templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to create template")
  }

  return response.json()
}

/**
 * Get template by ID
 */
export async function getTemplate(id: string): Promise<Template> {
  const response = await fetch(`/api/packagepro/templates/${id}`)

  if (!response.ok) {
    throw new Error("Template not found")
  }

  return response.json()
}

/**
 * Get template by slug
 */
export async function getTemplateBySlug(slug: string): Promise<Template> {
  const response = await fetch(`/api/packagepro/templates/slug/${slug}`)

  if (!response.ok) {
    throw new Error("Template not found")
  }

  return response.json()
}

/**
 * Search templates
 */
export async function searchTemplates(
  filters: TemplateSearchFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<TemplateSearchResult> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...(filters.category && { category: filters.category }),
    ...(filters.style && { style: filters.style }),
    ...(filters.minRating && { minRating: filters.minRating.toString() }),
    ...(filters.searchQuery && { q: filters.searchQuery }),
    ...(filters.tags && filters.tags.length > 0 && { tags: filters.tags.join(",") }),
  })

  const response = await fetch(`/api/packagepro/templates/search?${params}`)

  if (!response.ok) {
    throw new Error("Search failed")
  }

  return response.json()
}

/**
 * Get popular templates
 */
export async function getPopularTemplates(limit: number = 10): Promise<Template[]> {
  const response = await fetch(`/api/packagepro/templates/popular?limit=${limit}`)

  if (!response.ok) {
    throw new Error("Failed to fetch popular templates")
  }

  return response.json()
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
 * Update template
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Pick<Template, "name" | "description" | "category" | "style" | "tags" | "isPublic" | "designState">>
): Promise<Template> {
  const response = await fetch(`/api/packagepro/templates/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error("Failed to update template")
  }

  return response.json()
}

/**
 * Delete template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`/api/packagepro/templates/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Failed to delete template")
  }
}

/**
 * Add rating to template
 */
export async function addTemplateRating(
  templateId: string,
  rating: number,
  comment?: string
): Promise<TemplateRating> {
  const response = await fetch(`/api/packagepro/templates/${templateId}/ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rating, comment }),
  })

  if (!response.ok) {
    throw new Error("Failed to add rating")
  }

  return response.json()
}

/**
 * Get template ratings
 */
export async function getTemplateRatings(templateId: string): Promise<TemplateRating[]> {
  const response = await fetch(`/api/packagepro/templates/${templateId}/ratings`)

  if (!response.ok) {
    throw new Error("Failed to fetch ratings")
  }

  return response.json()
}

/**
 * Load template into editor
 */
export function loadTemplateIntoEditor(template: Template) {
  // This would be called from the editor page
  // It updates the design store with template's designState
  return template.designState
}

