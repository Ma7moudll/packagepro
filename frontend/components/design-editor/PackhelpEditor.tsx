"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { resolveDieline } from "@/lib/editor/geometry/resolve-dieline"
import { DesignCanvas2D } from "@/components/editor/canvas/DesignCanvas2D"
import { DesignCanvas3D } from "@/components/editor/canvas/DesignCanvas3D"
import { DielineCanvas } from "@/components/editor/canvas/DielineCanvas"
import { WallViewCanvas } from "@/components/editor/canvas/WallViewCanvas"
import { analyticsService } from "@/lib/analytics/analytics-service"

interface PackhelpEditorProps {
  productType?: "box" | "bag" | "cup" | "tube"
  boxType?: "mailer-box" | "gift-box" | "folding-carton" | "rigid-box" | "cup" | "bag" | "shipping-box"
  material?: string
  initialDesign?: {
    elements?: any[]
    colors?: { primary: string; secondary: string }
    dimensions?: { length: number; width: number; height: number }
  }
  onSave?: (design: any) => void
  onAddText?: () => void
  onAddImage?: (file: File) => void
  onDelete?: () => void
  onCopy?: () => void
}

const MATERIAL_COLORS: Record<string, string> = {
  "cardboard-white": "#ffffff",
  "cardboard-kraft": "#b8936a", // Natural kraft brown
  "cardboard-coated": "#ffffff",
  "corrugated-white": "#f8f9fa",
  "corrugated-kraft": "#a67c52", // Natural corrugated kraft - darker brown
}

// Initialize store with initial design if provided
export function PackhelpEditor({
  productType = "box",
  boxType = "mailer-box",
  material,
  initialDesign,
  onSave,
  onAddText,
  onAddImage,
  onDelete,
  onCopy,
}: PackhelpEditorProps) {
  const viewMode = useDesignStore((s) => s.ui.viewMode)
  const applyCoreState = useDesignStore((s) => s.applyCoreState)
  const product = useDesignStore((s) => s.product)
  const dimensions = useDesignStore((s) => s.model.dimensions)

  // M8-D: SINGLE canonical geometry resolution point. The blueprint (M8-B
  // passthrough) + mm dimensions become DielineGeometry exactly once here;
  // DielineCanvas consumes the result and never resolves again. Products
  // without a blueprint yield { ok:false, reason:"no-blueprint" }, which
  // DielineView routes to the frozen M7DielineFallback.
  const dielineResolution = useMemo(
    () => resolveDieline(product?.dieline, dimensions),
    [product?.dieline, dimensions.length, dimensions.width, dimensions.height]
  )

  // Track editor opened
  useEffect(() => {
    analyticsService.track("editor_opened", {
      productType,
      boxType,
    })
  }, [productType, boxType])

  const isInitialized = useRef(false)

  // Initialize store with initial design if provided
  useEffect(() => {
    if (isInitialized.current) return

    // When the store was already hydrated by initFromEditorConfig (catalog-driven entry),
    // do not clobber it with the default initialDesign props.
    const existing = useDesignStore.getState()
    if (existing.product?.id) {
      isInitialized.current = true
      return
    }

    applyCoreState((core) => {
      let newState = { ...core }

      // 1. Apply dimensions
      if (initialDesign?.dimensions) {
        newState.model = {
          ...newState.model,
          dimensions: initialDesign.dimensions,
        }
      }

      // 2. Apply model type
      const typeMap: Record<string, any> = {
        "mailer-box": "mailer_box",
        "rigid-box": "rigid_box",
        "shipping-box": "shipping_box",
        "gift-box": "gift_box",
        "folding-carton": "folding_carton",
        "cup": "cup",
        "bag": "bag"
      }

      if (boxType) {
        newState.model = {
          ...newState.model,
          type: typeMap[boxType] || "mailer_box"
        }
      }

      // 3. Apply material
      if (material) {
        const mappedMaterial = material === "cardboard-natural" ? "cardboard-kraft" : material
        newState.model = {
          ...newState.model,
          material: mappedMaterial
        }

        // Default color based on material if none provided
        if (!initialDesign?.colors?.primary) {
          newState.canvas = {
            ...newState.canvas,
            backgroundColor: MATERIAL_COLORS[mappedMaterial] || newState.canvas.backgroundColor
          }
        }
      }

      // 4. Apply custom colors if provided (overrides material default)
      if (initialDesign?.colors?.primary) {
        newState.canvas = {
          ...newState.canvas,
          backgroundColor: initialDesign.colors.primary,
        }
      }

      return newState
    })

    isInitialized.current = true
  }, [initialDesign, boxType, material, applyCoreState])

  switch (viewMode) {
    case "2d":
      return <DesignCanvas2D />
    case "3d":
      return <DesignCanvas3D productType={productType} />
    case "dieline":
      return <DielineCanvas resolution={dielineResolution} />
    case "wall":
      return <WallViewCanvas />
    default:
      return <DesignCanvas2D />
  }
}
