"use client"

import { Template, TemplateSearchFilters } from "@/lib/editor/types/template"
import { searchTemplates } from "./template-service"

/**
 * Advanced search with Algolia integration (placeholder)
 * In production, this would use Algolia client
 */
export class TemplateSearchService {
  private algoliaClient: any = null
  private indexName = "templates"

  constructor() {
    // Initialize Algolia client if API keys are available
    // if (process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY) {
    //   this.algoliaClient = algoliasearch(
    //     process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
    //     process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
    //   )
    // }
  }

  /**
   * Search templates with filters
   */
  async search(
    query: string = "",
    filters: TemplateSearchFilters = {},
    page: number = 1,
    pageSize: number = 20
  ) {
    // If Algolia is configured, use it
    if (this.algoliaClient) {
      return this.searchWithAlgolia(query, filters, page, pageSize)
    }

    // Otherwise, use API search
    return searchTemplates(
      {
        ...filters,
        searchQuery: query,
      },
      page,
      pageSize
    )
  }

  /**
   * Search using Algolia
   */
  private async searchWithAlgolia(
    query: string,
    filters: TemplateSearchFilters,
    page: number,
    pageSize: number
  ) {
    // const index = this.algoliaClient.initIndex(this.indexName)
    // const algoliaFilters: string[] = []
    // if (filters.category) {
    //   algoliaFilters.push(`category:${filters.category}`)
    // }
    // if (filters.style) {
    //   algoliaFilters.push(`style:${filters.style}`)
    // }
    // const result = await index.search(query, {
    //   filters: algoliaFilters.join(" AND "),
    //   page: page - 1,
    //   hitsPerPage: pageSize,
    // })
    // return {
    //   templates: result.hits as Template[],
    //   total: result.nbHits,
    //   page,
    //   pageSize,
    // }

    // Fallback to API
    return searchTemplates(
      {
        ...filters,
        searchQuery: query,
      },
      page,
      pageSize
    )
  }

  /**
   * Index a template in Algolia (for admin/backend use)
   */
  async indexTemplate(template: Template) {
    if (!this.algoliaClient) {
      console.warn("Algolia not configured, skipping indexing")
      return
    }

    // const index = this.algoliaClient.initIndex(this.indexName)
    // await index.saveObject({
    //   objectID: template.id,
    //   ...template,
    // })
  }

  /**
   * Remove template from Algolia index
   */
  async removeTemplate(templateId: string) {
    if (!this.algoliaClient) {
      return
    }

    // const index = this.algoliaClient.initIndex(this.indexName)
    // await index.deleteObject(templateId)
  }
}

// Singleton instance
export const templateSearchService = new TemplateSearchService()

