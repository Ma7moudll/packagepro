"use client"

export interface Project {
  id: string
  name: string
  description?: string
  folderId?: string
  thumbnailUrl?: string
  status: "draft" | "in-progress" | "review" | "approved" | "rejected" | "archived"
  visibility: "private" | "team" | "public"
  ownerId: string
  teamIds: string[]
  sharedWith: ProjectShare[]
  createdAt: string
  updatedAt: string
  version: number
  currentVersionId: string
  templateId?: string
  tags: string[]
  metadata: ProjectMetadata
}

export interface ProjectMetadata {
  clientName?: string
  clientEmail?: string
  deadline?: string
  priority?: "low" | "medium" | "high" | "urgent"
  budget?: number
  currency?: string
  notes?: string
  customFields?: Record<string, any>
}

export interface ProjectFolder {
  id: string
  name: string
  description?: string
  parentId?: string
  color?: string
  icon?: string
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface ProjectShare {
  id: string
  projectId: string
  userId: string
  role: "viewer" | "editor" | "admin"
  permissions: string[]
  sharedAt: string
  sharedBy: string
}

export interface ProjectVersion {
  id: string
  projectId: string
  version: number
  name?: string
  description?: string
  snapshot: any // Design state snapshot
  createdAt: string
  createdBy: string
  changeLog?: string
  isCurrent: boolean
  tags?: string[]
}

export interface ProjectTemplate {
  id: string
  name: string
  description?: string
  thumbnailUrl?: string
  category: string
  tags: string[]
  templateData: any // Design state template
  isPublic: boolean
  isPremium: boolean
  usageCount: number
  rating?: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ProjectComment {
  id: string
  projectId: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  type: "comment" | "feedback" | "suggestion"
  status: "open" | "resolved" | "archived"
  position?: {
    x: number
    y: number
    faceId?: string
    layerId?: string
  }
  replies: ProjectComment[]
  mentions: string[]
  attachments: string[]
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  resolvedBy?: string
}

export interface ApprovalWorkflow {
  id: string
  projectId: string
  name: string
  steps: ApprovalStep[]
  currentStepIndex: number
  status: "pending" | "in-progress" | "approved" | "rejected" | "cancelled"
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface ApprovalStep {
  id: string
  order: number
  name: string
  approverId: string
  approverName: string
  approverEmail: string
  status: "pending" | "approved" | "rejected" | "skipped"
  comments?: string
  required: boolean
  deadline?: string
  completedAt?: string
  notifiedAt?: string
}

export interface ProjectFilter {
  folderId?: string
  status?: string[]
  visibility?: string[]
  ownerId?: string
  teamId?: string
  tags?: string[]
  search?: string
  dateRange?: {
    from: string
    to: string
  }
}

export interface ProjectSort {
  field: "name" | "createdAt" | "updatedAt" | "status" | "deadline"
  order: "asc" | "desc"
}

