"use client"

import {
  Project,
  ProjectFolder,
  ProjectVersion,
  ProjectShare,
  ProjectComment,
  ApprovalWorkflow,
} from "./types"

export class ProjectService {
  /**
   * Create project
   */
  async createProject(data: Partial<Project>): Promise<Project> {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error("Failed to create project")
    }

    return response.json()
  }

  /**
   * Get project by ID
   */
  async getProject(id: string): Promise<Project> {
    const response = await fetch(`/api/projects/${id}`)
    if (!response.ok) {
      throw new Error("Failed to fetch project")
    }
    return response.json()
  }

  /**
   * List projects
   */
  async listProjects(filters?: any): Promise<Project[]> {
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

    const response = await fetch(`/api/projects?${params.toString()}`)
    if (!response.ok) {
      throw new Error("Failed to fetch projects")
    }
    return response.json()
  }

  /**
   * Update project
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const response = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error("Failed to update project")
    }

    return response.json()
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete project")
    }
  }

  /**
   * Share project
   */
  async shareProject(projectId: string, share: Omit<ProjectShare, "id" | "projectId" | "sharedAt" | "sharedBy">): Promise<ProjectShare> {
    const response = await fetch(`/api/projects/${projectId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(share),
    })

    if (!response.ok) {
      throw new Error("Failed to share project")
    }

    return response.json()
  }

  /**
   * Get project shares
   */
  async getShares(projectId: string): Promise<ProjectShare[]> {
    const response = await fetch(`/api/projects/${projectId}/shares`)
    if (!response.ok) {
      throw new Error("Failed to fetch shares")
    }
    return response.json()
  }

  /**
   * Remove share
   */
  async removeShare(projectId: string, shareId: string): Promise<void> {
    const response = await fetch(`/api/projects/${projectId}/shares/${shareId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to remove share")
    }
  }

  /**
   * Create version
   */
  async createVersion(projectId: string, version: Omit<ProjectVersion, "id" | "projectId" | "createdAt" | "createdBy" | "isCurrent">): Promise<ProjectVersion> {
    const response = await fetch(`/api/projects/${projectId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(version),
    })

    if (!response.ok) {
      throw new Error("Failed to create version")
    }

    return response.json()
  }

  /**
   * Get versions
   */
  async getVersions(projectId: string): Promise<ProjectVersion[]> {
    const response = await fetch(`/api/projects/${projectId}/versions`)
    if (!response.ok) {
      throw new Error("Failed to fetch versions")
    }
    return response.json()
  }

  /**
   * Restore version
   */
  async restoreVersion(projectId: string, versionId: string): Promise<Project> {
    const response = await fetch(`/api/projects/${projectId}/versions/${versionId}/restore`, {
      method: "POST",
    })

    if (!response.ok) {
      throw new Error("Failed to restore version")
    }

    return response.json()
  }

  /**
   * Create folder
   */
  async createFolder(folder: Omit<ProjectFolder, "id" | "projectCount" | "createdAt" | "updatedAt">): Promise<ProjectFolder> {
    const response = await fetch("/api/projects/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(folder),
    })

    if (!response.ok) {
      throw new Error("Failed to create folder")
    }

    return response.json()
  }

  /**
   * Get folders
   */
  async getFolders(): Promise<ProjectFolder[]> {
    const response = await fetch("/api/projects/folders")
    if (!response.ok) {
      throw new Error("Failed to fetch folders")
    }
    return response.json()
  }

  /**
   * Add comment
   */
  async addComment(projectId: string, comment: Omit<ProjectComment, "id" | "projectId" | "createdAt" | "updatedAt" | "replies">): Promise<ProjectComment> {
    const response = await fetch(`/api/projects/${projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comment),
    })

    if (!response.ok) {
      throw new Error("Failed to add comment")
    }

    return response.json()
  }

  /**
   * Get comments
   */
  async getComments(projectId: string): Promise<ProjectComment[]> {
    const response = await fetch(`/api/projects/${projectId}/comments`)
    if (!response.ok) {
      throw new Error("Failed to fetch comments")
    }
    return response.json()
  }

  /**
   * Update comment
   */
  async updateComment(projectId: string, commentId: string, updates: Partial<ProjectComment>): Promise<ProjectComment> {
    const response = await fetch(`/api/projects/${projectId}/comments/${commentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error("Failed to update comment")
    }

    return response.json()
  }

  /**
   * Delete comment
   */
  async deleteComment(projectId: string, commentId: string): Promise<void> {
    const response = await fetch(`/api/projects/${projectId}/comments/${commentId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete comment")
    }
  }

  /**
   * Create approval workflow
   */
  async createWorkflow(projectId: string, workflow: Omit<ApprovalWorkflow, "id" | "projectId" | "createdAt" | "updatedAt">): Promise<ApprovalWorkflow> {
    const response = await fetch(`/api/projects/${projectId}/workflows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    })

    if (!response.ok) {
      throw new Error("Failed to create workflow")
    }

    return response.json()
  }

  /**
   * Get workflow
   */
  async getWorkflow(projectId: string): Promise<ApprovalWorkflow | null> {
    const response = await fetch(`/api/projects/${projectId}/workflows`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error("Failed to fetch workflow")
    }
    return response.json()
  }

  /**
   * Approve/reject workflow step
   */
  async approveStep(projectId: string, stepId: string, approved: boolean, comments?: string): Promise<ApprovalWorkflow> {
    const response = await fetch(`/api/projects/${projectId}/workflows/steps/${stepId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved, comments }),
    })

    if (!response.ok) {
      throw new Error("Failed to approve/reject step")
    }

    return response.json()
  }
}

export const projectService = new ProjectService()
