"use client"

export interface ExportPreset {
  id: string
  name: string
  description?: string
  format: "png" | "jpg" | "pdf" | "svg" | "gltf" | "zip"
  settings: ExportSettings
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ExportSettings {
  dpi: number
  quality: number // 0-100
  colorMode: "rgb" | "cmyk" | "grayscale"
  format: "png" | "jpg" | "pdf" | "svg" | "gltf" | "zip"
  includeBleed: boolean
  bleedSize: number // mm
  includeCropMarks: boolean
  includeColorBars: boolean
  includeRegistrationMarks: boolean
  compression?: "none" | "low" | "medium" | "high"
  pages?: "all" | "selected" | "range"
  pageRange?: { from: number; to: number }
  layers?: "all" | "visible" | "selected"
  faces?: "all" | string[]
}

export interface ExportJob {
  id: string
  projectId: string
  presetId?: string
  settings: ExportSettings
  status: "pending" | "processing" | "completed" | "failed"
  progress: number // 0-100
  files: ExportFile[]
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
}

export interface ExportFile {
  id: string
  name: string
  url: string
  size: number
  format: string
  faceId?: string
  layerId?: string
}

export interface BatchExportRequest {
  projectIds: string[]
  presetId?: string
  settings?: Partial<ExportSettings>
  outputFormat: "individual" | "zip" | "cloud"
  cloudStorage?: CloudStorageConfig
}

export interface CloudStorageConfig {
  provider: "google-drive" | "dropbox" | "onedrive" | "s3"
  folderId?: string
  folderPath?: string
  accessToken?: string
  refreshToken?: string
}

export interface ExportSchedule {
  id: string
  name: string
  projectId: string
  presetId?: string
  settings: ExportSettings
  schedule: ScheduleConfig
  cloudStorage?: CloudStorageConfig
  enabled: boolean
  lastRun?: string
  nextRun?: string
  createdAt: string
  updatedAt: string
}

export interface ScheduleConfig {
  type: "daily" | "weekly" | "monthly" | "custom"
  time: string // HH:mm
  dayOfWeek?: number // 0-6 (Sunday-Saturday)
  dayOfMonth?: number // 1-31
  cronExpression?: string
  timezone: string
}

export interface PrintReadyPackage {
  id: string
  projectId: string
  name: string
  files: PrintReadyFile[]
  metadata: PrintPackageMetadata
  createdAt: string
}

export interface PrintReadyFile {
  id: string
  name: string
  type: "artwork" | "die-cut" | "fold-lines" | "instructions" | "color-specs"
  url: string
  format: string
  size: number
  faceId?: string
}

export interface PrintPackageMetadata {
  dimensions: {
    width: number
    height: number
    depth: number
    unit: string
  }
  material: string
  colors: {
    front: number
    back: number
    sides: number
  }
  specialEffects: string[]
  instructions: string
  contactInfo: {
    name: string
    email: string
    phone?: string
  }
}

