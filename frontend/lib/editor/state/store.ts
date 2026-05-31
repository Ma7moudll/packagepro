"use client"

import { create } from "zustand"
import { nanoid } from "nanoid"
import {
  DesignCoreState,
  DesignState,
  HistoryState,
  Layer,
  ToolType,
  FaceId,
  ModelState,
  CanvasState,
  CameraState,
  UIState,
} from "./types"

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

  const canvas: CanvasState = {
    width: 600, // Initial width for front face
    height: 300,
    backgroundColor: "#d2b48c", // Default for Kraft
  }

  const model: ModelState = {
    type: "mailer_box",
    category: "boxes",
    dimensions: { length: 200, width: 150, height: 100 },
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
  setSelectedLayers: (ids: string[]) => void
  reorderLayers: (idsInOrder: string[]) => void
  applyCoreState: (updater: (core: DesignCoreState) => DesignCoreState) => void
  undo: () => void
  redo: () => void
  resetHistory: () => void
}

export const useDesignStore = create<DesignStore>((set, get) => {
  const initialCore = createInitialCoreState()
  const initialHistory = wrapWithHistory(initialCore)

  const pushToHistory = (nextCore: DesignCoreState) => {
    set((state) => ({
      history: {
        past: [...state.history.past, state.history.present],
        present: nextCore,
        future: [],
      },
      ...nextCore,
    }))
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
        const { length, width, height } = core.model.dimensions

        // Calculate canvas dimensions based on face
        let canvasWidth = 800
        let canvasHeight = 600

        if (faceId === "front" || faceId === "back" || faceId === "inside_front" || faceId === "inside_back") {
          canvasWidth = length * 3 // Scale factor for canvas view
          canvasHeight = height * 3
        } else if (faceId === "top" || faceId === "bottom" || faceId === "inside_top" || faceId === "inside_bottom") {
          canvasWidth = length * 3
          canvasHeight = width * 3
        } else if (faceId === "left" || faceId === "right" || faceId === "inside_left" || faceId === "inside_right") {
          canvasWidth = width * 3
          canvasHeight = height * 3
        }

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
          ui: nextCore.ui,
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
      const nextCore = updater(core)
      pushToHistory(nextCore)
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
  }
})


