"use client"

export interface Asset {
  id: string
  name: string
  type: "image" | "video" | "document" | "font" | "logo" | "icon" | "template" | "other"
  mimeType: string
  url: string
  thumbnailUrl?: string
  size: number
  width?: number
  height?: number
  duration?: number
  uploadedAt: string
  updatedAt: string
  uploadedBy: string
  version: number
  currentVersionId: string
  category?: string
  tags: string[]
  metadata: AssetMetadata
  brandId?: string
  projectIds: string[]
  isShared: boolean
  isPublic: boolean
}

export interface AssetMetadata {
  title?: string
  description?: string
  alt?: string
  author?: string
  copyright?: string
  colorSpace?: string
  dpi?: number
  format?: string
  orientation?: "landscape" | "portrait" | "square"
  exif?: Record<string, any>
}

export interface AssetVersion {
  id: string
  assetId: string
  version: number
  url: string
  thumbnailUrl?: string
  size: number
  createdAt: string
  createdBy: string
  changeLog?: string
  isCurrent: boolean
}

export interface AssetCategory {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  color?: string
  icon?: string
  assetCount: number
}

export interface AssetTag {
  id: string
  name: string
  slug: string
  color?: string
  assetCount: number
}

export interface BrandAsset {
  id: string
  brandId: string
  assetId: string
  role: "logo" | "primary-color" | "secondary-color" | "font" | "pattern" | "icon" | "other"
  priority: number
  usage: string[]
  guidelines?: string
}

export interface AssetUpload {
  file: File
  name?: string
  category?: string
  tags?: string[]
  brandId?: string
  projectId?: string
  metadata?: Partial<AssetMetadata>
}

export interface BulkOperation {
  type: "delete" | "move" | "tag" | "untag" | "category" | "share" | "unshare"
  assetIds: string[]
  data?: any
}

export interface AssetFilter {
  type?: string[]
  category?: string[]
  tags?: string[]
  brandId?: string
  projectId?: string
  isShared?: boolean
  isPublic?: boolean
  search?: string
  dateRange?: {
    from: string
    to: string
  }
  sizeRange?: {
    min: number
    max: number
  }
}

export interface AssetSort {
  field: "name" | "size" | "uploadedAt" | "updatedAt" | "version"
  order: "asc" | "desc"
}

