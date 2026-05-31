"use client"

import { create } from "zustand"
import { ExportPreset, ExportJob, ExportSchedule } from "./types"

interface ExportStore {
  presets: ExportPreset[]
  jobs: ExportJob[]
  schedules: ExportSchedule[]
  activeJobs: Set<string>
  loading: boolean
  error: string | null

  // Actions
  setPresets: (presets: ExportPreset[]) => void
  addPreset: (preset: ExportPreset) => void
  updatePreset: (id: string, updates: Partial<ExportPreset>) => void
  deletePreset: (id: string) => void
  setJobs: (jobs: ExportJob[]) => void
  addJob: (job: ExportJob) => void
  updateJob: (id: string, updates: Partial<ExportJob>) => void
  setSchedules: (schedules: ExportSchedule[]) => void
  addSchedule: (schedule: ExportSchedule) => void
  updateSchedule: (id: string, updates: Partial<ExportSchedule>) => void
  deleteSchedule: (id: string) => void
  addActiveJob: (jobId: string) => void
  removeActiveJob: (jobId: string) => void
}

export const useExportStore = create<ExportStore>((set) => ({
  presets: [],
  jobs: [],
  schedules: [],
  activeJobs: new Set(),
  loading: false,
  error: null,

  setPresets: (presets) => set({ presets }),

  addPreset: (preset) =>
    set((state) => ({
      presets: [...state.presets, preset],
    })),

  updatePreset: (id, updates) =>
    set((state) => ({
      presets: state.presets.map((preset) =>
        preset.id === id
          ? { ...preset, ...updates, updatedAt: new Date().toISOString() }
          : preset
      ),
    })),

  deletePreset: (id) =>
    set((state) => ({
      presets: state.presets.filter((preset) => preset.id !== id),
    })),

  setJobs: (jobs) => set({ jobs }),

  addJob: (job) =>
    set((state) => ({
      jobs: [job, ...state.jobs],
      activeJobs: new Set([...state.activeJobs, job.id]),
    })),

  updateJob: (id, updates) =>
    set((state) => {
      const updatedJobs = state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates } : job
      )
      const updatedJob = updatedJobs.find((j) => j.id === id)
      const newActiveJobs = new Set(state.activeJobs)

      if (updatedJob?.status === "completed" || updatedJob?.status === "failed") {
        newActiveJobs.delete(id)
      }

      return {
        jobs: updatedJobs,
        activeJobs: newActiveJobs,
      }
    }),

  setSchedules: (schedules) => set({ schedules }),

  addSchedule: (schedule) =>
    set((state) => ({
      schedules: [...state.schedules, schedule],
    })),

  updateSchedule: (id, updates) =>
    set((state) => ({
      schedules: state.schedules.map((schedule) =>
        schedule.id === id
          ? { ...schedule, ...updates, updatedAt: new Date().toISOString() }
          : schedule
      ),
    })),

  deleteSchedule: (id) =>
    set((state) => ({
      schedules: state.schedules.filter((schedule) => schedule.id !== id),
    })),

  addActiveJob: (jobId) =>
    set((state) => ({
      activeJobs: new Set([...state.activeJobs, jobId]),
    })),

  removeActiveJob: (jobId) =>
    set((state) => {
      const newSet = new Set(state.activeJobs)
      newSet.delete(jobId)
      return { activeJobs: newSet }
    }),
}))

