"use client"

import { Asset, AssetVersion, AssetUpload, BulkOperation, AssetCategory, AssetTag } from "./types"
import { nanoid } from "nanoid"

export class AssetService {
  /**
   * Upload asset
   */
  async uploadAsset(upload: AssetUpload): Promise<Asset> {
    // In production, upload to cloud storage (S3, Cloudinary, etc.)
    const formData = new FormData()
    formData.append("file", upload.file)
    if (upload.name) formData.append("name", upload.name)
    if (upload.category) formData.append("category", upload.category)
    if (upload.tags) formData.append("tags", JSON.stringify(upload.tags))
    if (upload.brandId) formData.append("brandId", upload.brandId)
    if (upload.projectId) formData.append("projectId", upload.projectId)
    if (upload.metadata) formData.append("metadata", JSON.stringify(upload.metadata))

    const response = await fetch("/api/assets/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to upload asset")
    }

    return response.json()
  }

  /**
   * Get asset by ID
   */
  async getAsset(id: string): Promise<Asset> {
    const response = await fetch(`/api/assets/${id}`)
    if (!response.ok) {
      throw new Error("Failed to fetch asset")
    }
    return response.json()
  }

  /**
   * List assets with filters
   */
  async listAssets(filters?: any): Promise<Asset[]> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, JSON.stringify(value))
          } else {
            params.append(key, String(value))
          }
        }
      })
    }

    const response = await fetch(`/api/assets?${params.toString()}`)
    if (!response.ok) {
      throw new Error("Failed to fetch assets")
    }
    return response.json()
  }

  /**
   * Update asset
   */
  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    const response = await fetch(`/api/assets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error("Failed to update asset")
    }

    return response.json()
  }

  /**
   * Delete asset
   */
  async deleteAsset(id: string): Promise<void> {
    const response = await fetch(`/api/assets/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete asset")
    }
  }

  /**
   * Create new version
   */
  async createVersion(assetId: string, file: File, changeLog?: string): Promise<AssetVersion> {
    const formData = new FormData()
    formData.append("file", file)
    if (changeLog) formData.append("changeLog", changeLog)

    const response = await fetch(`/api/assets/${assetId}/versions`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to create version")
    }

    return response.json()
  }

  /**
   * Get asset versions
   */
  async getVersions(assetId: string): Promise<AssetVersion[]> {
    const response = await fetch(`/api/assets/${assetId}/versions`)
    if (!response.ok) {
      throw new Error("Failed to fetch versions")
    }
    return response.json()
  }

  /**
   * Restore version
   */
  async restoreVersion(assetId: string, versionId: string): Promise<Asset> {
    const response = await fetch(`/api/assets/${assetId}/versions/${versionId}/restore`, {
      method: "POST",
    })

    if (!response.ok) {
      throw new Error("Failed to restore version")
    }

    return response.json()
  }

  /**
   * Bulk operations
   */
  async bulkOperation(operation: BulkOperation): Promise<void> {
    const response = await fetch("/api/assets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(operation),
    })

    if (!response.ok) {
      throw new Error("Failed to perform bulk operation")
    }
  }

  /**
   * Share asset with project
   */
  async shareWithProject(assetId: string, projectId: string): Promise<Asset> {
    return this.updateAsset(assetId, {
      projectIds: [], // Will be merged on server
    })
  }

  /**
   * Get categories
   */
  async getCategories(): Promise<AssetCategory[]> {
    const response = await fetch("/api/assets/categories")
    if (!response.ok) {
      throw new Error("Failed to fetch categories")
    }
    return response.json()
  }

  /**
   * Get tags
   */
  async getTags(): Promise<AssetTag[]> {
    const response = await fetch("/api/assets/tags")
    if (!response.ok) {
      throw new Error("Failed to fetch tags")
    }
    return response.json()
  }
}

export const assetService = new AssetService()

