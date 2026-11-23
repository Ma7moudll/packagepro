import * as THREE from "three"

/** All distances use the editor's 100 mm = 1 scene unit convention. */
export function mailerConstruction(length: number, width: number, height: number) {
  const thickness = Math.min(0.02, length / 40, width / 40, height / 15)
  return {
    thickness,
    clearance: thickness * 0.45,
    cornerRadius: Math.min(0.035, width * 0.025),
    rollWidth: thickness * 2.8,
    tuckDepth: Math.min(height * 0.55, width * 0.35),
    wingDepth: Math.min(height * 0.72, length * 0.22),
    notchRadius: Math.min(length * 0.055, height * 0.13),
  }
}

export function mailerFoldAngles(open: number) {
  const progress = Math.max(0, Math.min(1, open))
  const lift = progress * Math.PI * 0.59
  // Keep the locking wings in their receiver slots until their lowest rear
  // corner is above the side wall. Unfolding them earlier cuts through it.
  const wingRelease = Math.max(0, (progress - 0.78) / 0.22)
  const wing = Math.PI / 2 * (1 - wingRelease * 0.76)
  // The tuck initially lifts vertically out of the front wall. Only after
  // clearance does it relax towards the opened lid, like a scored paper hinge.
  const release = Math.max(0, Math.min(1, (lift - 0.5) / (Math.PI * 0.59 - 0.5)))
  const eased = release * release * (3 - 2 * release)
  const tuck = (Math.PI / 2 + lift) * (1 - eased) + Math.PI * 0.06 * eased
  return { lid: -lift, wing, tuck }
}

export type PanelProfile = "rounded" | "tuck" | "wing" | "notch"

/** Centred die-cut panel in XY. +Z is print/outside, -Z is inside.
 * Caps have separate material groups, edges never inherit printed artwork.
 * UVs stay in the original rectangular panel bounds, not the clipped outline.
 */
export function createMailerPanel(width: number, height: number, thickness: number, profile: PanelProfile = "rounded", radius = 0.025, curveSegments = 16) {
  const x = width / 2, y = height / 2
  const r = Math.min(radius, width / 8, height / 8)
  const s = new THREE.Shape()
  if (profile === "notch") {
    const n = Math.min(width * 0.055, height * 0.13)
    s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y)
    s.lineTo(n, y)
    s.absarc(0, y, n, 0, -Math.PI, true)
    s.lineTo(-x, y); s.closePath()
  } else if (profile === "tuck" || profile === "wing") {
    const shoulder = Math.min(width * (profile === "wing" ? 0.18 : 0.07), height * 0.28)
    s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y - shoulder)
    s.quadraticCurveTo(x, y, x - shoulder, y)
    s.lineTo(-x + shoulder, y); s.quadraticCurveTo(-x, y, -x, y - shoulder)
    s.closePath()
  } else {
    s.moveTo(-x + r, -y); s.lineTo(x - r, -y)
    s.quadraticCurveTo(x, -y, x, -y + r); s.lineTo(x, y - r)
    s.quadraticCurveTo(x, y, x - r, y); s.lineTo(-x + r, y)
    s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r)
    s.quadraticCurveTo(-x, -y, -x + r, -y); s.closePath()
  }
  const g = new THREE.ExtrudeGeometry(s, {
    depth: thickness, bevelEnabled: true,
    bevelThickness: thickness * 0.12, bevelSize: thickness * 0.12,
    bevelSegments: 2, steps: 1, curveSegments,
  })
  g.translate(0, 0, -thickness / 2)
  const uv = g.getAttribute("uv"), pos = g.getAttribute("position"), normals = g.getAttribute("normal")
  g.clearGroups()
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(normals.getZ(i)) > 0.99) {
      const u = (pos.getX(i) + x) / width
      uv.setXY(i, normals.getZ(i) < 0 ? 1 - u : u, (pos.getY(i) + y) / height)
    } else {
      uv.setXY(i, uv.getX(i) * 8, (pos.getZ(i) + thickness / 2) / thickness)
    }
  }
  // ExtrudeGeometry is non-indexed. Explicit groups keep cap artwork off edges.
  let groupStart = 0, previousMaterial = -1
  for (let i = 0; i < pos.count; i += 3) {
    const nz = normals.getZ(i)
    const material = nz > 0.99 ? 0 : nz < -0.99 ? 1 : 2
    if (material !== previousMaterial) {
      if (previousMaterial >= 0) g.addGroup(groupStart, i - groupStart, previousMaterial)
      groupStart = i; previousMaterial = material
    }
  }
  g.addGroup(groupStart, pos.count - groupStart, previousMaterial)
  uv.needsUpdate = true
  return g
}
