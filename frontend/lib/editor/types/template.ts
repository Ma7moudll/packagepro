"use client"

import { DesignCoreState } from "@/lib/editor/state/types"

export type TemplateCategory = 
  | "box" 
  | "ecommerce" 
  | "food" 
  | "cosmetics" 
  | "electronics" 
  | "fashion" 
  | "healthcare" 
  | "luxury" 
  | "minimal" 
  | "other"

export type TemplateStyle = 
  | "minimal" 
  | "bold" 
  | "eco" 
  | "luxury" 
  | "playful" 
  | "professional" 
  | "vintage" 
  | "modern"

export type ClosureType = "self-locking" | "tuck" | "snap" | "velcro" | "metal-clasp" | "tape-seal"

export type CardboardColor = "kraft-brown" | "white" | "black" | "recycled-gray" | "custom"

export interface Template {
  id: string
  slug: string
  name: string
  description: string
  category: TemplateCategory
  style: TemplateStyle
  thumbnailUrl: string
  preview3DUrl?: string
  realisticPreview?: string
  designState: DesignCoreState
  createdBy: string
  isPublic: boolean
  tags: string[]
  closureType?: ClosureType
  cardboardColor?: CardboardColor
  createdAt: string
  updatedAt: string
}

export interface TemplateSearchFilters {
  category?: TemplateCategory
  style?: TemplateStyle
  tags?: string[]
  searchQuery?: string
}

export interface TemplateSearchResult {
  templates: Template[]
  total: number
  page: number
  pageSize: number
}

