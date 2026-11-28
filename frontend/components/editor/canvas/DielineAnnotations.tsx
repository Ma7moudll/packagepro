"use client"

// DielineAnnotations — M8-E presentational overlay for the canonical dieline
// (fold-angle markers, glue-tab leader lines + mm labels, corner-relief marks).
//
// PURE PRESENTATION: it receives annotation data derived FROM the canonical
// `DielineGeometry` (see `lib/editor/geometry/annotations.ts`) and renders
// screen-only SVG. It NEVER computes/resolves geometry and produces no export
// output — `serializeSVG` remains the sole SVG export authority. Anchors and
// text stay tied to canonical path ids / FaceIds via data attributes.

import type {
  FoldAngleAnnotation,
  GlueTabAnnotation,
  CornerAnnotation,
} from "@/lib/editor/geometry/annotations"

interface DielineAnnotationsProps {
  folds: FoldAngleAnnotation[]
  glue: GlueTabAnnotation[]
  corners: CornerAnnotation[]
  visible: boolean
  bounds: { x0: number; y0: number; sheetW: number; sheetH: number }
}

export function DielineAnnotations({
  folds,
  glue,
  corners,
  visible,
  bounds,
}: DielineAnnotationsProps) {
  if (!visible) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={bounds.sheetW}
      height={bounds.sheetH}
      viewBox={`${bounds.x0} ${bounds.y0} ${bounds.sheetW} ${bounds.sheetH}`}
      style={{ left: bounds.x0, top: bounds.y0, zIndex: 5 }}
    >
      {folds.map((f) => (
        <g
          key={f.pathId}
          data-annotation="fold-angle"
          data-fold-path-id={f.pathId}
          data-face-id={f.faceId}
          data-other-face-id={f.otherFaceId}
          data-via={f.via}
        >
          <path
            d={`M ${f.at.x - 5} ${f.at.y} A 5 5 0 0 1 ${f.at.x} ${f.at.y - 5}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1"
          />
          <text x={f.at.x + 7} y={f.at.y - 7} fontSize={9} fill="#b45309">
            {f.angleDeg}°
          </text>
        </g>
      ))}

      {glue.map((g) => (
        <g
          key={g.pathId}
          data-annotation="glue-tab-leader"
          data-glue-path-id={g.pathId}
          data-face-id={g.faceId ?? ""}
        >
          <line
            x1={g.at.x}
            y1={g.at.y}
            x2={g.leaderTo.x}
            y2={g.leaderTo.y}
            stroke="#14b8a6"
            strokeWidth="0.75"
          />
          <circle cx={g.leaderTo.x} cy={g.leaderTo.y} r={1.6} fill="#14b8a6" />
          <text x={g.leaderTo.x + 3} y={g.leaderTo.y - 3} fontSize={9} fill="#0f766e">
            {g.labelMm}
          </text>
        </g>
      ))}

      {corners.map((c) => (
        <g
          key={c.index}
          data-annotation="corner-relief"
          data-corner-index={c.index}
          data-corner-at={`${c.at.x},${c.at.y}`}
          data-face-ids={c.faceIds.join(",")}
        >
          <path
            d={`M ${c.at.x} ${c.at.y} L ${c.at.x - 8} ${c.at.y} L ${c.at.x - 8} ${c.at.y + 8}`}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="0.75"
          />
          <text x={c.at.x - 13} y={c.at.y + 12} fontSize={9} fill="#7c3aed">
            {c.reliefLabel}
          </text>
        </g>
      ))}
    </svg>
  )
}