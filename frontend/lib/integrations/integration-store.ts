"use client"

import { create } from "zustand"
import { Integration, SyncJob } from "./types"

interface IntegrationStore {
  integrations: Integration[]
  syncJobs: SyncJob[]
  activeSyncs: Set<string>
  loading: boolean
  error: string | null

  // Actions
  setIntegrations: (integrations: Integration[]) => void
  addIntegration: (integration: Integration) => void
  updateIntegration: (id: string, updates: Partial<Integration>) => void
  removeIntegration: (id: string) => void
  setSyncJobs: (jobs: SyncJob[]) => void
  addSyncJob: (job: SyncJob) => void
  updateSyncJob: (id: string, updates: Partial<SyncJob>) => void
  addActiveSync: (jobId: string) => void
  removeActiveSync: (jobId: string) => void
}

export const useIntegrationStore = create<IntegrationStore>((set) => ({
  integrations: [],
  syncJobs: [],
  activeSyncs: new Set(),
  loading: false,
  error: null,

  setIntegrations: (integrations) => set({ integrations }),

  addIntegration: (integration) =>
    set((state) => ({
      integrations: [...state.integrations, integration],
    })),

  updateIntegration: (id, updates) =>
    set((state) => ({
      integrations: state.integrations.map((integration) =>
        integration.id === id
          ? { ...integration, ...updates, updatedAt: new Date().toISOString() }
          : integration
      ),
    })),

  removeIntegration: (id) =>
    set((state) => ({
      integrations: state.integrations.filter((integration) => integration.id !== id),
    })),

  setSyncJobs: (jobs) => set({ syncJobs: jobs }),

  addSyncJob: (job) =>
    set((state) => ({
      syncJobs: [job, ...state.syncJobs],
      activeSyncs: new Set([...state.activeSyncs, job.id]),
    })),

  updateSyncJob: (id, updates) =>
    set((state) => {
      const updatedJobs = state.syncJobs.map((job) =>
        job.id === id ? { ...job, ...updates } : job
      )
      const updatedJob = updatedJobs.find((j) => j.id === id)
      const newActiveSyncs = new Set(state.activeSyncs)

      if (updatedJob?.status === "completed" || updatedJob?.status === "failed") {
        newActiveSyncs.delete(id)
      }

      return {
        syncJobs: updatedJobs,
        activeSyncs: newActiveSyncs,
      }
    }),

  addActiveSync: (jobId) =>
    set((state) => ({
      activeSyncs: new Set([...state.activeSyncs, jobId]),
    })),

  removeActiveSync: (jobId) =>
    set((state) => {
      const newSet = new Set(state.activeSyncs)
      newSet.delete(jobId)
      return { activeSyncs: newSet }
    }),
}))

