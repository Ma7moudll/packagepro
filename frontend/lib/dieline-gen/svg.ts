// Batch R — layered SVG rendering of a dieline (units: mm throughout).
// Layers (groups): bleed (offset outline), panels+labels, glue (hatched),
// fold-valley (dashed), fold-mountain (dash-dot chain), cut (solid:
// the blank silhouette plus interior features — vents and slots).
// Fold direction is carried both by the separate groups and by a
// data-crease attribute on every fold line.

import type { Dieline, Pt } from "./types.ts"
import { offsetPolygon, outerSilhouette, silhouetteLoops } from "./geometry.ts"
import { fmt } from "./build.ts"
import { layoutLabels, LEGEND_FONT_MM, LEGEND_LINE_H } from "./labels.ts"

const n2 = (n: number): string => String(Math.round(n * 100) / 100)

function pathOf(poly: Pt[]): string {
  if (poly.length === 0) return ""
  return `M ${poly.map((p) => `${n2(p.x)} ${n2(p.y)}`).join(" L ")} Z`
}

function roundedRectPath(cx: number, cy: number, w: number, h: number): string {
  const r = Math.min(1.5, h / 2)
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const y0 = cy - h / 2
  const y1 = cy + h / 2
  return `M ${n2(x0 + r)} ${n2(y0)} L ${n2(x1 - r)} ${n2(y0)} A ${n2(r)} ${n2(r)} 0 0 1 ${n2(x1)} ${n2(y0 + r)} L ${n2(x1)} ${n2(y1 - r)} A ${n2(r)} ${n2(r)} 0 0 1 ${n2(x1 - r)} ${n2(y1)} L ${n2(x0 + r)} ${n2(y1)} A ${n2(r)} ${n2(r)} 0 0 1 ${n2(x0)} ${n2(y1 - r)} L ${n2(x0)} ${n2(y0 + r)} A ${n2(r)} ${n2(r)} 0 0 1 ${n2(x0 + r)} ${n2(y0)} Z`
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

export function renderDielineSvg(d: Dieline): string {
  const bleed = d.options.bleed
  // A two-piece sheet ("rigid") has one silhouette loop per piece; every
  // other type is one connected blank, so only the largest loop is used.
  const polys = d.panels.map((p) => p.polygon)
  const silhouettes = (d.type === "rigid" || d.type === "rigid_magnetic") ? silhouetteLoops(polys) : [outerSilhouette(polys)]
  const bleedLoops = bleed > 0 ? silhouettes.map((s) => offsetPolygon(s, bleed)) : []
  const bleedLoop = bleedLoops[0] ?? []
  const { labels, legend } = layoutLabels(d)
  const legendHeight = legend.length > 0 ? (legend.length + 1) * LEGEND_LINE_H + 2 : 0
  const totalW = d.blankWidth + 2 * bleed
  const totalH = d.blankHeight + 2 * bleed + legendHeight

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n2(totalW)}mm" height="${n2(totalH)}mm" viewBox="${n2(-bleed)} ${n2(-bleed)} ${n2(totalW)} ${n2(totalH)}">`,
  )
  parts.push(`<title>${esc(d.type)} dieline — internal ${fmt(d.spec.length)} × ${fmt(d.spec.width)} × ${fmt(d.spec.height)} mm, board ${fmt(d.spec.thickness)} mm</title>`)
  parts.push(
    `<desc>Layers: cut = solid black; fold-valley = dashed; fold-mountain = dash-dot chain; bleed = green offset outline (${fmt(bleed)} mm); glue = hatched. Units: mm. ${esc(d.styleNote)}</desc>`,
  )
  parts.push(
    `<defs><pattern id="glue-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="#fef3c7"/><line x1="0" y1="0" x2="0" y2="3" stroke="#b45309" stroke-width="0.8"/></pattern></defs>`,
  )

  if (bleedLoop.length > 0) {
    parts.push(`<g id="bleed" fill="none" stroke="#16a34a" stroke-width="0.25">${bleedLoops.map((l) => `<path d="${pathOf(l)}"/>`).join("")}</g>`)
  } else {
    parts.push(`<g id="bleed"></g>`)
  }

  // glue areas, hatched — painted BEFORE the labels: the hatch pattern
  // has an opaque background and would otherwise cover the glue flap's
  // own label (found in batch S2 inspection of batch R output: the glue
  // label was present in the file but painted over).
  parts.push(`<g id="glue">`)
  for (const p of d.panels.filter((p) => p.kind === "glue")) {
    parts.push(`<path d="${pathOf(p.polygon)}" fill="url(#glue-hatch)" stroke="#b45309" stroke-width="0.25"/>`)
  }
  parts.push(`</g>`)

  // panel faces (very light) + measured labels (batch S2: fitted boxes,
  // minimum size, code + legend fallback for small panels)
  parts.push(`<g id="labels">`)
  for (const p of d.panels) {
    if (p.kind !== "glue") parts.push(`<path d="${pathOf(p.polygon)}" fill="#0f172a" fill-opacity="0.045" stroke="none"/>`)
  }
  for (const l of labels) {
    const size = l.fontSize
    if (l.mode === "code") {
      parts.push(
        `<text x="${n2(l.cx)}" y="${n2(l.cy)}" font-family="sans-serif" font-size="${n2(size)}" fill="#334155" text-anchor="middle" dominant-baseline="middle" data-label-mode="code" data-panel="${esc(l.panelId)}">${esc(l.code ?? "")}</text>`,
      )
    } else {
      parts.push(
        `<text x="${n2(l.cx)}" y="${n2(l.cy)}" font-family="sans-serif" font-size="${n2(size)}" fill="#334155" text-anchor="middle" data-label-mode="full" data-panel="${esc(l.panelId)}"><tspan x="${n2(l.cx)}" dy="${n2(-size * 0.35)}">${esc(l.lines[0])}</tspan><tspan x="${n2(l.cx)}" dy="${n2(size * 1.05)}">${esc(l.lines[1])}</tspan></text>`,
      )
    }
  }
  parts.push(`</g>`)

  if (legend.length > 0) {
    const lx = -bleed + 1
    let ly = d.blankHeight + bleed + LEGEND_LINE_H
    parts.push(`<g id="legend" font-family="sans-serif" font-size="${n2(LEGEND_FONT_MM)}" fill="#334155">`)
    parts.push(`<text x="${n2(lx)}" y="${n2(ly)}" font-weight="bold">PANEL CODES</text>`)
    for (const e of legend) {
      ly += LEGEND_LINE_H
      parts.push(`<text x="${n2(lx)}" y="${n2(ly)}">${esc(e.code)} — ${esc(e.text)}</text>`)
    }
    parts.push(`</g>`)
  }

  // folds
  const foldLine = (f: Dieline["folds"][number]) =>
    `<line x1="${n2(f.from.x)}" y1="${n2(f.from.y)}" x2="${n2(f.to.x)}" y2="${n2(f.to.y)}" data-crease="${f.crease}" data-between="${esc(f.between[0])}|${esc(f.between[1])}"/>`
  parts.push(`<g id="fold-valley" fill="none" stroke="#2563eb" stroke-width="0.3" stroke-dasharray="3 2">`)
  for (const f of d.folds.filter((f) => f.crease === "valley")) parts.push(foldLine(f))
  parts.push(`</g>`)
  parts.push(`<g id="fold-mountain" fill="none" stroke="#2563eb" stroke-width="0.3" stroke-dasharray="7 2 1.5 2">`)
  for (const f of d.folds.filter((f) => f.crease === "mountain")) parts.push(foldLine(f))
  parts.push(`</g>`)

  // cut: silhouette + interior features (slots, vents)
  parts.push(`<g id="cut" fill="none" stroke="#111111" stroke-width="0.35">`)
  for (const loop of silhouettes) parts.push(`<path d="${pathOf(loop)}"/>`)
  for (const f of d.features) {
    if (f.kind === "slot") parts.push(`<path d="${roundedRectPath(f.at.x, f.at.y, f.w, f.h)}"/>`)
    if (f.kind === "vent") parts.push(`<circle cx="${n2(f.at.x)}" cy="${n2(f.at.y)}" r="${n2(f.r ?? f.w / 2)}"/>`)
  }
  parts.push(`</g>`)

  // magnet pocket marks (rigid_magnetic): a marked layer, not a cut
  const magnets = d.features.filter((f) => f.kind === "magnet")
  if (magnets.length > 0) {
    parts.push(`<g id="magnet" fill="none" stroke="#ea580c" stroke-width="0.3" stroke-dasharray="1 1">`)
    for (const f of magnets) parts.push(`<circle cx="${n2(f.at.x)}" cy="${n2(f.at.y)}" r="${n2(f.r ?? f.w / 2)}"/>`)
    parts.push(`</g>`)
  }

  // film features (pouch, bag): seals, zip strips, tear notches and the
  // valve are placement data, not cuts. They get their own layer so the
  // rendered pattern shows them without calling them cut lines.
  const film = d.features.filter((f) => f.kind === "seal" || f.kind === "zip" || f.kind === "notch" || f.kind === "valve")
  if (film.length > 0) {
    parts.push(`<g id="film" fill="none" stroke="#0891b2" stroke-width="0.3" stroke-dasharray="2 1">`)
    for (const f of film) parts.push(`<rect data-kind="${f.kind}" x="${n2(f.at.x - f.w / 2)}" y="${n2(f.at.y - f.h / 2)}" width="${n2(f.w)}" height="${n2(f.h)}"/>`)
    parts.push(`</g>`)
  }

  parts.push(`</svg>`)
  return parts.join("\n")
}
