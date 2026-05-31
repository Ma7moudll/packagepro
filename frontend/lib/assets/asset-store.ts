"use client"

import { create } from "zustand"
import { Asset, AssetVersion, AssetCategory, AssetTag, AssetFilter, AssetSort } from "./types"

interface AssetStore {
  assets: Asset[]
  versions: Map<string, AssetVersion[]>
  categories: AssetCategory[]
  tags: AssetTag[]
  selectedAssets: Set<string>
  filter: AssetFilter
  sort: AssetSort
  loading: boolean
  error: string | null

  // Actions
  setAssets: (assets: Asset[]) => void
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  selectAsset: (id: string) => void
  deselectAsset: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  toggleSelection: (id: string) => void
  setFilter: (filter: Partial<AssetFilter>) => void
  setSort: (sort: AssetSort) => void
  addVersion: (assetId: string, version: AssetVersion) => void
  getVersions: (assetId: string) => AssetVersion[]
  setCategories: (categories: AssetCategory[]) => void
  addCategory: (category: AssetCategory) => void
  setTags: (tags: AssetTag[]) => void
  addTag: (tag: AssetTag) => void
  getFilteredAssets: () => Asset[]
}

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: [],
  versions: new Map(),
  categories: [],
  tags: [],
  selectedAssets: new Set(),
  filter: {},
  sort: { field: "uploadedAt", order: "desc" },
  loading: false,
  error: null,

  setAssets: (assets) => set({ assets }),

  addAsset: (asset) =>
    set((state) => ({
      assets: [...state.assets, asset],
    })),

  updateAsset: (id, updates) =>
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === id ? { ...asset, ...updates, updatedAt: new Date().toISOString() } : asset
      ),
    })),

  deleteAsset: (id) =>
    set((state) => ({
      assets: state.assets.filter((asset) => asset.id !== id),
      selectedAssets: new Set([...state.selectedAssets].filter((aid) => aid !== id)),
    })),

  selectAsset: (id) =>
    set((state) => ({
      selectedAssets: new Set([...state.selectedAssets, id]),
    })),

  deselectAsset: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedAssets)
      newSet.delete(id)
      return { selectedAssets: newSet }
    }),

  selectAll: () =>
    set((state) => ({
      selectedAssets: new Set(state.assets.map((asset) => asset.id)),
    })),

  deselectAll: () =>
    set({
      selectedAssets: new Set(),
    }),

  toggleSelection: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedAssets)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return { selectedAssets: newSet }
    }),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  setSort: (sort) => set({ sort }),

  addVersion: (assetId, version) =>
    set((state) => {
      const versions = new Map(state.versions)
      const assetVersions = versions.get(assetId) || []
      versions.set(assetId, [...assetVersions, version])
      return { versions }
    }),

  getVersions: (assetId) => {
    const state = get()
    return state.versions.get(assetId) || []
  },

  setCategories: (categories) => set({ categories }),

  addCategory: (category) =>
    set((state) => ({
      categories: [...state.categories, category],
    })),

  setTags: (tags) => set({ tags }),

  addTag: (tag) =>
    set((state) => ({
      tags: [...state.tags, tag],
    })),

  getFilteredAssets: () => {
    const state = get()
    let filtered = [...state.assets]

    // Apply filters
    if (state.filter.type && state.filter.type.length > 0) {
      filtered = filtered.filter((asset) => state.filter.type!.includes(asset.type))
    }

    if (state.filter.category && state.filter.category.length > 0) {
      filtered = filtered.filter((asset) =>
        state.filter.category!.includes(asset.category || "")
      )
    }

    if (state.filter.tags && state.filter.tags.length > 0) {
      filtered = filtered.filter((asset) =>
        state.filter.tags!.some((tag) => asset.tags.includes(tag))
      )
    }

    if (state.filter.brandId) {
      filtered = filtered.filter((asset) => asset.brandId === state.filter.brandId)
    }

    if (state.filter.projectId) {
      filtered = filtered.filter((asset) =>
        asset.projectIds.includes(state.filter.projectId!)
      )
    }

    if (state.filter.isShared !== undefined) {
      filtered = filtered.filter((asset) => asset.isShared === state.filter.isShared)
    }

    if (state.filter.isPublic !== undefined) {
      filtered = filtered.filter((asset) => asset.isPublic === state.filter.isPublic)
    }

    if (state.filter.search) {
      const searchLower = state.filter.search.toLowerCase()
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchLower) ||
          asset.metadata.title?.toLowerCase().includes(searchLower) ||
          asset.metadata.description?.toLowerCase().includes(searchLower) ||
          asset.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      )
    }

    if (state.filter.dateRange) {
      filtered = filtered.filter((asset) => {
        const date = new Date(asset.uploadedAt)
        const from = new Date(state.filter.dateRange!.from)
        const to = new Date(state.filter.dateRange!.to)
        return date >= from && date <= to
      })
    }

    if (state.filter.sizeRange) {
      filtered = filtered.filter((asset) => {
        const size = asset.size
        return (
          size >= state.filter.sizeRange!.min && size <= state.filter.sizeRange!.max
        )
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (state.sort.field) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "size":
          aValue = a.size
          bValue = b.size
          break
        case "uploadedAt":
          aValue = new Date(a.uploadedAt).getTime()
          bValue = new Date(b.uploadedAt).getTime()
          break
        case "updatedAt":
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
        case "version":
          aValue = a.version
          bValue = b.version
          break
        default:
          return 0
      }

      if (aValue < bValue) return state.sort.order === "asc" ? -1 : 1
      if (aValue > bValue) return state.sort.order === "asc" ? 1 : -1
      return 0
    })

    return filtered
  },
}))

