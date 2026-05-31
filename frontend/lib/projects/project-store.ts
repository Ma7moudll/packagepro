"use client"

import { create } from "zustand"
import {
  Project,
  ProjectFolder,
  ProjectVersion,
  ProjectShare,
  ProjectComment,
  ApprovalWorkflow,
  ProjectFilter,
  ProjectSort,
} from "./types"

interface ProjectStore {
  projects: Project[]
  folders: ProjectFolder[]
  versions: Map<string, ProjectVersion[]>
  shares: Map<string, ProjectShare[]>
  comments: Map<string, ProjectComment[]>
  workflows: Map<string, ApprovalWorkflow>
  selectedProjects: Set<string>
  filter: ProjectFilter
  sort: ProjectSort
  loading: boolean
  error: string | null

  // Actions
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  selectProject: (id: string) => void
  deselectProject: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
  toggleSelection: (id: string) => void
  setFilter: (filter: Partial<ProjectFilter>) => void
  setSort: (sort: ProjectSort) => void

  // Folders
  setFolders: (folders: ProjectFolder[]) => void
  addFolder: (folder: ProjectFolder) => void
  updateFolder: (id: string, updates: Partial<ProjectFolder>) => void
  deleteFolder: (id: string) => void

  // Versions
  addVersion: (projectId: string, version: ProjectVersion) => void
  getVersions: (projectId: string) => ProjectVersion[]

  // Sharing
  addShare: (projectId: string, share: ProjectShare) => void
  getShares: (projectId: string) => ProjectShare[]
  removeShare: (projectId: string, shareId: string) => void

  // Comments
  addComment: (projectId: string, comment: ProjectComment) => void
  getComments: (projectId: string) => ProjectComment[]
  updateComment: (projectId: string, commentId: string, updates: Partial<ProjectComment>) => void
  deleteComment: (projectId: string, commentId: string) => void

  // Workflows
  setWorkflow: (projectId: string, workflow: ApprovalWorkflow) => void
  getWorkflow: (projectId: string) => ApprovalWorkflow | undefined

  // Filtered projects
  getFilteredProjects: () => Project[]
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  folders: [],
  versions: new Map(),
  shares: new Map(),
  comments: new Map(),
  workflows: new Map(),
  selectedProjects: new Set(),
  filter: {},
  sort: { field: "updatedAt", order: "desc" },
  loading: false,
  error: null,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
    })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id
          ? { ...project, ...updates, updatedAt: new Date().toISOString() }
          : project
      ),
    })),

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      selectedProjects: new Set([...state.selectedProjects].filter((pid) => pid !== id)),
    })),

  selectProject: (id) =>
    set((state) => ({
      selectedProjects: new Set([...state.selectedProjects, id]),
    })),

  deselectProject: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedProjects)
      newSet.delete(id)
      return { selectedProjects: newSet }
    }),

  selectAll: () =>
    set((state) => ({
      selectedProjects: new Set(state.projects.map((project) => project.id)),
    })),

  deselectAll: () =>
    set({
      selectedProjects: new Set(),
    }),

  toggleSelection: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedProjects)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return { selectedProjects: newSet }
    }),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  setSort: (sort) => set({ sort }),

  setFolders: (folders) => set({ folders }),

  addFolder: (folder) =>
    set((state) => ({
      folders: [...state.folders, folder],
    })),

  updateFolder: (id, updates) =>
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === id
          ? { ...folder, ...updates, updatedAt: new Date().toISOString() }
          : folder
      ),
    })),

  deleteFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== id),
    })),

  addVersion: (projectId, version) =>
    set((state) => {
      const versions = new Map(state.versions)
      const projectVersions = versions.get(projectId) || []
      versions.set(projectId, [...projectVersions, version])
      return { versions }
    }),

  getVersions: (projectId) => {
    const state = get()
    return state.versions.get(projectId) || []
  },

  addShare: (projectId, share) =>
    set((state) => {
      const shares = new Map(state.shares)
      const projectShares = shares.get(projectId) || []
      shares.set(projectId, [...projectShares, share])
      return { shares }
    }),

  getShares: (projectId) => {
    const state = get()
    return state.shares.get(projectId) || []
  },

  removeShare: (projectId, shareId) =>
    set((state) => {
      const shares = new Map(state.shares)
      const projectShares = shares.get(projectId) || []
      shares.set(
        projectId,
        projectShares.filter((share) => share.id !== shareId)
      )
      return { shares }
    }),

  addComment: (projectId, comment) =>
    set((state) => {
      const comments = new Map(state.comments)
      const projectComments = comments.get(projectId) || []
      comments.set(projectId, [...projectComments, comment])
      return { comments }
    }),

  getComments: (projectId) => {
    const state = get()
    return state.comments.get(projectId) || []
  },

  updateComment: (projectId, commentId, updates) =>
    set((state) => {
      const comments = new Map(state.comments)
      const projectComments = comments.get(projectId) || []
      comments.set(
        projectId,
        projectComments.map((comment) =>
          comment.id === commentId
            ? { ...comment, ...updates, updatedAt: new Date().toISOString() }
            : comment
        )
      )
      return { comments }
    }),

  deleteComment: (projectId, commentId) =>
    set((state) => {
      const comments = new Map(state.comments)
      const projectComments = comments.get(projectId) || []
      comments.set(
        projectId,
        projectComments.filter((comment) => comment.id !== commentId)
      )
      return { comments }
    }),

  setWorkflow: (projectId, workflow) =>
    set((state) => {
      const workflows = new Map(state.workflows)
      workflows.set(projectId, workflow)
      return { workflows }
    }),

  getWorkflow: (projectId) => {
    const state = get()
    return state.workflows.get(projectId)
  },

  getFilteredProjects: () => {
    const state = get()
    let filtered = [...state.projects]

    if (state.filter.folderId) {
      filtered = filtered.filter((project) => project.folderId === state.filter.folderId)
    }

    if (state.filter.status && state.filter.status.length > 0) {
      filtered = filtered.filter((project) => state.filter.status!.includes(project.status))
    }

    if (state.filter.visibility && state.filter.visibility.length > 0) {
      filtered = filtered.filter((project) =>
        state.filter.visibility!.includes(project.visibility)
      )
    }

    if (state.filter.ownerId) {
      filtered = filtered.filter((project) => project.ownerId === state.filter.ownerId)
    }

    if (state.filter.teamId) {
      filtered = filtered.filter((project) => project.teamIds.includes(state.filter.teamId!))
    }

    if (state.filter.tags && state.filter.tags.length > 0) {
      filtered = filtered.filter((project) =>
        state.filter.tags!.some((tag) => project.tags.includes(tag))
      )
    }

    if (state.filter.search) {
      const searchLower = state.filter.search.toLowerCase()
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower) ||
          project.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      )
    }

    if (state.filter.dateRange) {
      filtered = filtered.filter((project) => {
        const date = new Date(project.createdAt)
        const from = new Date(state.filter.dateRange!.from)
        const to = new Date(state.filter.dateRange!.to)
        return date >= from && date <= to
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
        case "createdAt":
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case "updatedAt":
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
        case "status":
          aValue = a.status
          bValue = b.status
          break
        case "deadline":
          aValue = a.metadata.deadline ? new Date(a.metadata.deadline).getTime() : 0
          bValue = b.metadata.deadline ? new Date(b.metadata.deadline).getTime() : 0
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

