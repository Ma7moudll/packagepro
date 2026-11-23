import * as THREE from 'three'
const skin = .0008
const clamp = (n: number) => Math.max(0, Math.min(1, n))

/** Preview-only flat film bag (frosted ziplock). Two flat film sheets
 * sealed at the side and bottom edges with a gentle centre pillow — no
 * stand-up gusset, no fold-over adhesive flap, no release liner. The
 * resealable zip is a raised strip near the top (see ZIP_* below). Film
 * gauge, seal widths and zip profile are illustrative only; closed
 * dimensions describe the bag body. Not a production dieline. */
export const ZIP_BAND = { v0: .885, v1: .945 } as const
export const ZIP_RIDGES = [.903, .927] as const

export function ziplockFilmPoint(width: number, height: number, depth: number, u: number, v: number, back = false) {
  const sx = Math.max(0, Math.sin(Math.PI * clamp(u))), sy = Math.max(0, Math.sin(Math.PI * clamp(v)))
  // Flat silhouette: the pillow vanishes at every sealed edge, so the two
  // sheets meet at the sides, bottom and top instead of floating apart.
  const bulge = depth * .5 * (sx * sy) ** .85
  return { x: (u - .5) * width, y: v * height, z: (skin + bulge) * (back ? -1 : 1) }
}

function grid(nu: number, nv: number, u0: number, u1: number, v0: number, v1: number, point: (u: number, v: number) => { x: number; y: number; z: number }, back = false) {
  const p: number[] = [], uv: number[] = [], idx: number[] = []
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = u0 + (u1 - u0) * (i / nu), v = v0 + (v1 - v0) * (j / nv), a = point(u, v)
    p.push(a.x, a.y, a.z); uv.push(back ? 1 - u : u, v)
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1
    idx.push(...(back ? [a, c, b, b, c, d] : [a, b, c, b, d, c]))
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx); g.computeVertexNormals(); return g
}

/** One film sheet. The back sheet mirrors U in its UVs, so back artwork
 * reads correctly when the bag is turned over (never mirrored). */
export function createZiplockFilmSurface(width: number, height: number, depth: number, back = false) {
  return grid(28, 36, 0, 1, 0, 1, (u, v) => ziplockFilmPoint(width, height, depth, u, v, back), back)
}

/** A raised ribbon that follows the film surface at height fraction
 * vCenter — one ridge of the zip profile, or the wider zip band. */
export function createZiplockZipStrip(width: number, height: number, depth: number, vCenter: number, halfHeight: number, lift: number, back = false) {
  const sign = back ? -1 : 1
  return grid(28, 2, .015, .985, vCenter - halfHeight, vCenter + halfHeight, (u, v) => {
    const p = ziplockFilmPoint(width, height, depth, u, v, back)
    return { ...p, z: p.z + sign * lift }
  }, back)
}
