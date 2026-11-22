"use client"

// DielineCanvas — migrated dieline canvas (M8-D).
//
// Thin store-wiring wrapper around the pure canonical renderer DielineView.
// Geometry resolution happens ONCE upstream (PackhelpEditor) via resolveDieline
// and arrives here as a `resolution` prop — there is no component-level
// buildDieline / generateDieline in this module. When no canonical blueprint
// exists (resolution absent = no-blueprint), DielineView delegates to the
// frozen M7 compatibility surface (M7DielineFallback).

import { useEffect, useState } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { generateTextureFromLayers } from "@/lib/editor/services/texture-generator"
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
  const layers = useDesignStore((s) => s.layers)
  const model = useDesignStore((s) => s.model)

  // Display-only artwork per face (outside and inside), rendered from the same layers the
  // 3D preview uses. Transparent where nothing is drawn. It is never part of
  // the SVG export and never changes the canonical geometry.
  const [artworkFrame, setArtworkFrame] = useState<{model:typeof model;layers:typeof layers;textures:Record<string,string>}|null>(null)
  // Withhold artwork when the resolved geometry was built from other
  // dimensions than the artwork's (stale resolution): scale would be wrong.
  const geomDims = resolution?.ok ? resolution.geometry.dims : undefined
  const dimsMatch = !!geomDims &&
    Math.abs(geomDims.length - model.dimensions.length) < 0.01 &&
    Math.abs(geomDims.width - model.dimensions.width) < 0.01 &&
    Math.abs(geomDims.height - model.dimensions.height) < 0.01
  useEffect(() => {
    if (product?.support === "deferred" || !dimsMatch) { setArtworkFrame(null); return }
    let cancelled = false
    const timer = setTimeout(() => {
      generateTextureFromLayers(layers, model, { scale: 2 })
        .then((textures) => {
          if (cancelled) return
          setArtworkFrame({model,layers,textures})
        })
        .catch(() => { if (!cancelled) setArtworkFrame(null) })
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [layers, model, product?.support, dimsMatch])

  // Never paint an old image on a newly resolved or resized panel while the
  // asynchronous texture pass catches up.
  const faceArtwork = dimsMatch && artworkFrame?.model === model && artworkFrame.layers === layers
    ? artworkFrame.textures : undefined

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
      faceArtwork={faceArtwork}
      artworkDimensionsUnavailable={!dimsMatch && layers.some(layer=>layer.visible)}
      selectedFace={selectedFace}
      onSelectFace={setSelectedFace}
    />
  )
}