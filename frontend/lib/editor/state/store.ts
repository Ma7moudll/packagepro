"use client"

import { create } from "zustand"
import { nanoid } from "nanoid"
import { mmToPx, facePanel } from "@/lib/editor/geometry/units"
import {
  DesignCoreState,
  DesignState,
  DesignLifecycleStatus,
  HistoryState,
  Layer,
  ToolType,
  Face,
  FaceId,
  ModelState,
  CanvasState,
  CameraState,
  UIState,
} from "./types"
import type { DielineBlueprint } from "../../../../shared/types/index.ts"

/** Minimal shape of EditorConfig consumed by the store (avoids circular import). */
export interface EditorConfigLike {
  product: {
    id: string; slug: string; name: string; type: string; boxType?: string
    structure?: {
      type?: string
      boxType?: string
      faces?: Record<string, { width?: number; height?: number; depth?: number; label: string }>
      zones?: Record<string, Array<{ label: string; required: boolean; position: [number, number, number]; rotation?: [number, number, number] }>>
    }
    /** M8: canonical packaging blueprint — additive optional passthrough (typed from the shared schema since M8-D). */
    schemaVersion?: number
    unit?: 'mm'
    dieline?: DielineBlueprint
    prepress?: { caliperMm?: number; fluteType?: string; glueFlapToleranceMm?: number }
  }
  variant: { id: string; sku: string; sizeCode: string | null; materialCode: string | null; color?: string; printMode: string; printSides: number; finish: string; dimensions: { length: number; width: number; height: number; unit?: string } }
  material: { code: string; name: string; hex: string }
  quantity: number
  pricing?: { unitPrice: number; totalPrice: number; currency?: string }
  sessionId?: string
}

function createInitialCoreState(): DesignCoreState {
  const defaultFaces: ModelState["faces"] = [
    { id: "front", name: "Front" },
    { id: "back", name: "Back" },
    { id: "left", name: "Left" },
    { id: "right", name: "Right" },
    { id: "top", name: "Top" },
    { id: "bottom", name: "Bottom" },
    // Internal faces
    { id: "inside_front", name: "Inside Front" },
    { id: "inside_back", name: "Inside Back" },
    { id: "inside_left", name: "Inside Left" },
    { id: "inside_right", name: "Inside Right" },
    { id: "inside_top", name: "Inside Top" },
    { id: "inside_bottom", name: "Inside Bottom" },
  ]

  const initialDimensions = { length: 200, width: 150, height: 100 }

  const canvas: CanvasState = {
    width: mmToPx(initialDimensions.length), // front face (length × height) at PX_PER_MM
    height: mmToPx(initialDimensions.height),
    backgroundColor: "#d2b48c", // Default for Kraft
  }

  const model: ModelState = {
    type: "mailer_box",
    category: "boxes",
    dimensions: initialDimensions,
    material: "cardboard-kraft",
    faces: defaultFaces,
    printCoverage: "outside",
    adhesiveStrip: "none",
    finishing: "none",
    lamination: "none",
    fluteType: "E",
    colorVariant: "one_colour",
    sizePreset: "F52",
    quantity: 30,
  }

  const camera: CameraState = {
    position: [4, 4, 4],
    target: [0, 0, 0],
    zoom: 1,
  }

  const ui: UIState = {
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    gridVisible: true,
    guidesVisible: true,
    selectedFace: "front",
    viewMode: "3d",
    boxOpenState: 0, // 0 = closed, 1 = fully open
  }

  return {
    canvas,
    model,
    layers: [],
    selectedLayerIds: [],
    camera,
    activeTool: "select",
    ui,
    lifecycleStatus: "DRAFT" as const,
  }
}

function wrapWithHistory(core: DesignCoreState): HistoryState<DesignCoreState> {
  return {
    past: [],
    present: core,
    future: [],
  }
}

export interface DesignStore extends DesignState {
  // Actions
  setActiveTool: (tool: ToolType) => void
  setSelectedFace: (faceId: FaceId) => void
  setCameraZoom: (zoom: number) => void
  toggleGrid: () => void
  toggleGuides: () => void
  setLeftSidebarOpen: (open: boolean) => void
  setRightSidebarOpen: (open: boolean) => void
  setViewMode: (mode: "2d" | "3d" | "dieline" | "wall") => void
  setBoxOpenState: (value: number) => void
  toggleBoxOpen: () => void
  addLayer: (partial: Partial<Layer>) => string
  updateLayer: (id: string, updater: (layer: Layer) => Layer) => void
  removeLayer: (id: string) => void
  clearLayers: () => void
  setSelectedLayers: (ids: string[]) => void
  reorderLayers: (idsInOrder: string[]) => void
  applyCoreState: (updater: (core: DesignCoreState) => DesignCoreState) => void
  initFromEditorConfig: (config: EditorConfigLike) => void
  undo: () => void
  redo: () => void
  resetHistory: () => void
  // Lifecycle actions
  setLifecycleStatus: (status: DesignLifecycleStatus) => void
  setDesignId: (id: string | undefined) => void
  isReadOnly: () => boolean
  submitDesign: (designId: string) => Promise<any>
  recallDesign: (designId: string) => Promise<any>
}

export const useDesignStore = create<DesignStore>((set, get) => {
  const initialCore = createInitialCoreState()
  const initialHistory = wrapWithHistory(initialCore)

  // Live workspace prefs (viewMode, panels, guides) must survive any state
  // replacement that rebuilds history.present.ui back over the top-level `ui`
  // (M7-C) — otherwise e.g. setSelectedFace or a history push silently reverts
  // the chosen view mode and unmounts the 2D canvas.
  const withPreservedLiveUi = (core: DesignCoreState, liveUi: UIState): UIState => ({
    ...core.ui,
    viewMode: liveUi.viewMode,
    gridVisible: liveUi.gridVisible,
    guidesVisible: liveUi.guidesVisible,
    leftSidebarOpen: liveUi.leftSidebarOpen,
    rightSidebarOpen: liveUi.rightSidebarOpen,
  })

  const pushToHistory = (nextCore: DesignCoreState) => {
    set((state) => {
      return {
        history: {
          past: [...state.history.past, state.history.present],
          present: nextCore,
          future: [],
        },
        ...nextCore,
        ui: withPreservedLiveUi(nextCore, state.ui),
      }
    })
  }

  return {
    ...initialCore,
    history: initialHistory,

    setActiveTool: (tool) => {
      set((state) => ({
        activeTool: tool,
        history: state.history,
      }))
    },

    setSelectedFace: (faceId) => {
      set((state) => {
        const core = state.history.present

        // Canvas sized from the canonical face-panel mapping (§7) via mmToPx
        const panel = facePanel(core.model.dimensions, faceId)
        const canvasWidth = mmToPx(panel.w)
        const canvasHeight = mmToPx(panel.h)

        const nextCore: DesignCoreState = {
          ...core,
          canvas: {
            ...core.canvas,
            width: canvasWidth,
            height: canvasHeight,
          },
          ui: { ...core.ui, selectedFace: faceId },
        }

        return {
          ...state,
          canvas: nextCore.canvas,
          ui: withPreservedLiveUi(nextCore, state.ui),
          history: {
            past: [...state.history.past, state.history.present],
            present: nextCore,
            future: [],
          },
        }
      })
    },

    setCameraZoom: (zoom) => {
      set((state) => ({
        camera: { ...state.camera, zoom },
        history: state.history,
      }))
    },

    toggleGrid: () => {
      set((state) => ({
        ui: { ...state.ui, gridVisible: !state.ui.gridVisible },
        history: state.history,
      }))
    },

    toggleGuides: () => {
      set((state) => ({
        ui: { ...state.ui, guidesVisible: !state.ui.guidesVisible },
        history: state.history,
      }))
    },

    setLeftSidebarOpen: (open) => {
      set((state) => ({
        ui: { ...state.ui, leftSidebarOpen: open },
        history: state.history,
      }))
    },

    setRightSidebarOpen: (open) => {
      set((state) => ({
        ui: { ...state.ui, rightSidebarOpen: open },
        history: state.history,
      }))
    },

    setViewMode: (mode) => {
      set((state) => ({
        ui: { ...state.ui, viewMode: mode },
        history: state.history,
      }))
    },

    setBoxOpenState: (value) => {
      set((state) => ({
        ui: { ...state.ui, boxOpenState: Math.max(0, Math.min(1, value)) },
        history: state.history,
      }))
    },

    toggleBoxOpen: () => {
      set((state) => ({
        ui: { ...state.ui, boxOpenState: state.ui.boxOpenState > 0.5 ? 0 : 1 },
        history: state.history,
      }))
    },

    addLayer: (partial) => {
      const id = partial.id ?? nanoid()
      const core = get().history.present
      const faceId: FaceId = partial.faceId ?? core.ui.selectedFace

      const base: Layer = {
        id,
        type: partial.type ?? "text",
        name: partial.name ?? "Layer",
        visible: partial.visible ?? true,
        locked: partial.locked ?? false,
        opacity: partial.opacity ?? 1,
        blendMode: partial.blendMode ?? "normal",
        position: partial.position ?? { x: core.canvas.width / 2, y: core.canvas.height / 2 },
        rotation: partial.rotation ?? 0,
        scale: partial.scale ?? { x: 1, y: 1 },
        faceId,
        textProperties: partial.textProperties,
        imageProperties: partial.imageProperties,
        shapeProperties: partial.shapeProperties,
      }

      const nextCore: DesignCoreState = {
        ...core,
        layers: [...core.layers, base],
        selectedLayerIds: [id],
      }

      pushToHistory(nextCore)
      return id
    },

    updateLayer: (id, updater) => {
      const core = get().history.present
      const nextLayers = core.layers.map((layer) => (layer.id === id ? updater(layer) : layer))
      const nextCore: DesignCoreState = {
        ...core,
        layers: nextLayers,
      }
      pushToHistory(nextCore)
    },

    removeLayer: (id) => {
      const core = get().history.present
      const nextLayers = core.layers.filter((layer) => layer.id !== id)
      const nextSelected = core.selectedLayerIds.filter((lid) => lid !== id)
      const nextCore: DesignCoreState = {
        ...core,
        layers: nextLayers,
        selectedLayerIds: nextSelected,
      }
      pushToHistory(nextCore)
    },

    clearLayers: () => {
      const core = get().history.present
      const nextCore: DesignCoreState = { ...core, layers: [], selectedLayerIds: [] }
      pushToHistory(nextCore)
    },

    setSelectedLayers: (ids) => {
      set((state) => ({
        selectedLayerIds: ids,
        history: state.history,
      }))
    },

    reorderLayers: (idsInOrder) => {
      const core = get().history.present
      const layerById = new Map(core.layers.map((l) => [l.id, l]))
      const nextLayers: Layer[] = []
      idsInOrder.forEach((id) => {
        const layer = layerById.get(id)
        if (layer) nextLayers.push(layer)
      })
      const nextCore: DesignCoreState = {
        ...core,
        layers: nextLayers,
      }
      pushToHistory(nextCore)
    },

    applyCoreState: (updater) => {
      const core = get().history.present
      let nextCore = updater(core)
      // M7-C: the view mode is a live client preference — never let a state
      // replacement (session restore, template load, editor re-init) revert it.
      nextCore = { ...nextCore, ui: { ...nextCore.ui, viewMode: get().ui.viewMode } }
      // M7-C: migrate legacy designs — scenes persist one flat layer list, so any
      // layer without a faceId belongs to the default (front) face.
      if (nextCore.layers.some((l) => !l.faceId)) {
        nextCore = {
          ...nextCore,
          layers: nextCore.layers.map((l) =>
            l.faceId ? l : { ...l, faceId: "front" as const }
          ),
        }
      }
      pushToHistory(nextCore)
    },

    initFromEditorConfig: (config) => {
      const current = get().history.present
      const dims = config.variant.dimensions
      const length = Number(dims.length) || 200
      const width = Number(dims.width) || 150
      const height = Number(dims.height) || 100

      // Faces depend on print coverage — outside faces always, inside when 2-sided.
      const outsideIds: FaceId[] = ["front", "back", "left", "right", "top", "bottom"]
      const insideIds: FaceId[] = ["inside_front", "inside_back", "inside_left", "inside_right", "inside_top", "inside_bottom"]
      const DEFAULT_OUTSIDE: Record<string, string> = {
        front: "Front", back: "Back", left: "Left", right: "Right", top: "Top", bottom: "Bottom",
      }
      const DEFAULT_INSIDE: Record<string, string> = {
        inside_front: "Inside Front", inside_back: "Inside Back", inside_left: "Inside Left",
        inside_right: "Inside Right", inside_top: "Inside Top", inside_bottom: "Inside Bottom",
      }
      const structureFaces = config.product.structure?.faces

      // M7: when the backend supplies real ProductStructure faces, use them as
      // the source of truth (labels + geometry); fall back to canonical defaults.
      const resolveFace = (id: FaceId): Face => {
        const s = structureFaces?.[id]
        return s
          ? { id, name: s.label, width: s.width, height: s.height, depth: s.depth }
          : { id, name: DEFAULT_OUTSIDE[id] ?? DEFAULT_INSIDE[id] ?? id }
      }

      const outsideFaces = outsideIds
        .filter((id) => !structureFaces || structureFaces[id])
        .map((id) => resolveFace(id))
      const insideFaces = insideIds
        .filter((id) => !structureFaces || structureFaces[id])
        .map((id) => resolveFace(id))
      const faces = (config.variant.printSides >= 2 ? [...outsideFaces, ...insideFaces] : outsideFaces)

      // Canvas sized for the front face (length × height) via the canonical factor
      const rawType = (config.product.boxType || config.product.type || "mailer_box").replace(/-/g, "_")
      const modelType = rawType as ModelState["type"]
      const canvas: CanvasState = {
        width: mmToPx(length),
        height: mmToPx(height),
        backgroundColor: config.material.hex || "#d2b48c",
      }

      const model: ModelState = {
        ...current.model,
        type: modelType,
        category: "boxes",
        dimensions: { length, width, height },
        material: config.material.code || "cardboard-kraft",
        faces,
        quantity: config.quantity,
      }

      const nextCore: DesignCoreState = {
        ...current,
        canvas,
        model,
        ui: { ...current.ui, selectedFace: "front", viewMode: get().ui.viewMode },
        product: {
          id: config.product.id,
          slug: config.product.slug,
          name: config.product.name,
          type: config.product.type,
          boxType: config.product.boxType,
          ...(config.product.dieline ? { dieline: config.product.dieline } : {}),
        },
        structureType: config.product.structure?.type,
        zones: config.product.structure?.zones,
        productConfig: {
          selectedSize: config.variant.sizeCode ?? undefined,
          selectedMaterial: config.material.code,
          selectedFinish: config.variant.finish !== "none" ? config.variant.finish : undefined,
          quantity: config.quantity,
          variantId: config.variant.id,
          sku: config.variant.sku,
        },
        ...(config.sessionId && { sessionId: config.sessionId }),
        lifecycleStatus: "DRAFT" as const,
      }

      // Reset history so the EditorConfig init becomes the clean baseline
      set({
        ...nextCore,
        history: { past: [], present: nextCore, future: [] },
      })
    },

    undo: () => {
      set((state) => {
        const { past, present, future } = state.history
        if (past.length === 0) return state
        const previous = past[past.length - 1]
        const newPast = past.slice(0, past.length - 1)
        return {
          ...state,
          ...previous,
          history: {
            past: newPast,
            present: previous,
            future: [present, ...future],
          },
        }
      })
    },

    redo: () => {
      set((state) => {
        const { past, present, future } = state.history
        if (future.length === 0) return state
        const next = future[0]
        const newFuture = future.slice(1)
        return {
          ...state,
          ...next,
          history: {
            past: [...past, present],
            present: next,
            future: newFuture,
          },
        }
      })
    },

    resetHistory: () => {
      const core = createInitialCoreState()
      return {
        ...core,
        history: wrapWithHistory(core),
      }
    },

    setLifecycleStatus: (status) => {
      set((state) => ({
        lifecycleStatus: status,
      }))
    },

    setDesignId: (id) => {
      set((state) => ({
        designId: id,
      }))
    },

    isReadOnly: () => {
      const state = get()
      // Design is read-only if it's not in DRAFT status
      return state.lifecycleStatus !== "DRAFT"
    },

    submitDesign: async (designId: string) => {
      try {
        const response = await fetch(`/api/designs/${designId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
          },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to submit design")
        }

        const data = await response.json()
        set({
          lifecycleStatus: data.data.lifecycleStatus,
        })

        return data.data
      } catch (error) {
        console.error("Submit design error:", error)
        throw error
      }
    },

    recallDesign: async (designId: string) => {
      try {
        const response = await fetch(`/api/designs/${designId}/recall`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
          },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to recall design")
        }

        const data = await response.json()
        set({
          lifecycleStatus: data.data.lifecycleStatus,
        })

        return data.data
      } catch (error) {
        console.error("Recall design error:", error)
        throw error
      }
    },
  }
})


