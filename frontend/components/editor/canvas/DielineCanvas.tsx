"use client"

// DielineCanvas — migrated dieline canvas (M8-D).
//
// Thin store-wiring wrapper around the pure canonical renderer DielineView.
// Geometry resolution happens ONCE upstream (PackhelpEditor) via resolveDieline
// and arrives here as a `resolution` prop — there is no component-level
// buildDieline / generateDieline in this module. When no canonical blueprint
// exists (resolution absent = no-blueprint), DielineView delegates to the
// frozen M7 compatibility surface (M7DielineFallback).

import { useDesignStore } from "@/lib/editor/state/store"
import { DielineView } from "@/components/editor/canvas/DielineView"
import { DeferredDielinePlaceholder } from "@/components/editor/canvas/DeferredDielinePlaceholder"
import type { DielineResolution } from "@/lib/editor/geometry/resolve-dieline"

interface DielineCanvasProps {
  resolution?: DielineResolution
}

export function DielineCanvas({ resolution }: DielineCanvasProps) {
  const canvas = useDesignStore((s) => s.canvas)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)
  const setSelectedFace = useDesignStore((s) => s.setSelectedFace)
  const product = useDesignStore((s) => s.product)

  // M8-J (spec §14): deferred products never render a net — not the canonical
  // DielineView, and not the frozen M7 generic fallback. Show the deferral
  // placeholder instead (fake geometry is never shipped).
  if (product?.support === "deferred") {
    return <DeferredDielinePlaceholder reason={product.supportReason} />
  }

  return (
    <DielineView
      resolution={resolution}
      backgroundColor={canvas.backgroundColor}
      selectedFace={selectedFace}
      onSelectFace={setSelectedFace}
    />
  )
}