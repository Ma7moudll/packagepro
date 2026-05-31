"use client"

import {
  ExportPreset,
  ExportSettings,
  ExportJob,
  BatchExportRequest,
  ExportSchedule,
  CloudStorageConfig,
  PrintReadyPackage,
} from "./types"

export class ExportService {
  /**
   * Create export preset
   */
  async createPreset(preset: Omit<ExportPreset, "id" | "createdAt" | "updatedAt">): Promise<ExportPreset> {
    const response = await fetch("/api/export/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    })

    if (!response.ok) {
      throw new Error("Failed to create preset")
    }

    return response.json()
  }

  /**
   * Get presets
   */
  async getPresets(): Promise<ExportPreset[]> {
    const response = await fetch("/api/export/presets")
    if (!response.ok) {
      throw new Error("Failed to fetch presets")
    }
    return response.json()
  }

  /**
   * Update preset
   */
  async updatePreset(id: string, updates: Partial<ExportPreset>): Promise<ExportPreset> {
    const response = await fetch(`/api/export/presets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error("Failed to update preset")
    }

    return response.json()
  }

  /**
   * Delete preset
   */
  async deletePreset(id: string): Promise<void> {
    const response = await fetch(`/api/export/presets/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete preset")
    }
  }

  /**
   * Export project
   */
  async exportProject(
    projectId: string,
    settings: ExportSettings,
    presetId?: string
  ): Promise<ExportJob> {
    const response = await fetch(`/api/export/projects/${projectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings, presetId }),
    })

    if (!response.ok) {
      throw new Error("Failed to export project")
    }

    return response.json()
  }

  /**
   * Batch export
   */
  async batchExport(request: BatchExportRequest): Promise<ExportJob> {
    const response = await fetch("/api/export/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error("Failed to batch export")
    }

    return response.json()
  }

  /**
   * Get export job status
   */
  async getJobStatus(jobId: string): Promise<ExportJob> {
    const response = await fetch(`/api/export/jobs/${jobId}`)
    if (!response.ok) {
      throw new Error("Failed to fetch job status")
    }
    return response.json()
  }

  /**
   * Download export
   */
  async downloadExport(jobId: string, fileId?: string): Promise<Blob> {
    const url = fileId
      ? `/api/export/jobs/${jobId}/files/${fileId}/download`
      : `/api/export/jobs/${jobId}/download`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error("Failed to download export")
    }
    return response.blob()
  }

  /**
   * Export to cloud storage
   */
  async exportToCloud(
    projectId: string,
    settings: ExportSettings,
    cloudConfig: CloudStorageConfig
  ): Promise<ExportJob> {
    const response = await fetch(`/api/export/projects/${projectId}/cloud`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings, cloudStorage: cloudConfig }),
    })

    if (!response.ok) {
      throw new Error("Failed to export to cloud")
    }

    return response.json()
  }

  /**
   * Create export schedule
   */
  async createSchedule(schedule: Omit<ExportSchedule, "id" | "createdAt" | "updatedAt" | "lastRun" | "nextRun">): Promise<ExportSchedule> {
    const response = await fetch("/api/export/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    })

    if (!response.ok) {
      throw new Error("Failed to create schedule")
    }

    return response.json()
  }

  /**
   * Get schedules
   */
  async getSchedules(projectId?: string): Promise<ExportSchedule[]> {
    const params = projectId ? `?projectId=${projectId}` : ""
    const response = await fetch(`/api/export/schedules${params}`)
    if (!response.ok) {
      throw new Error("Failed to fetch schedules")
    }
    return response.json()
  }

  /**
   * Update schedule
   */
  async updateSchedule(id: string, updates: Partial<ExportSchedule>): Promise<ExportSchedule> {
    const response = await fetch(`/api/export/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error("Failed to update schedule")
    }

    return response.json()
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(id: string): Promise<void> {
    const response = await fetch(`/api/export/schedules/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete schedule")
    }
  }

  /**
   * Generate print-ready package
   */
  async generatePrintPackage(
    projectId: string,
    settings: ExportSettings
  ): Promise<PrintReadyPackage> {
    const response = await fetch(`/api/export/projects/${projectId}/print-package`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate print package")
    }

    return response.json()
  }

  /**
   * Download print package
   */
  async downloadPrintPackage(packageId: string): Promise<Blob> {
    const response = await fetch(`/api/export/print-packages/${packageId}/download`)
    if (!response.ok) {
      throw new Error("Failed to download print package")
    }
    return response.blob()
  }
}

export const exportService = new ExportService()

