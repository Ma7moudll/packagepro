// Batch T6b — clamp-saturation pins. An independent audit found
// that every Math.min / Math.max clamp in the eight generators was
// exercised on only one branch by the T6 pin sizes: e.g.
// mailer.ts:41 ang = min(8, tuckW * 0.1) saturates at the cap for
// every T6 mailer size (tuckW >= 117.5), so the +0.5 / +3.0 mutants
// of the 0.1 literal were invisible (measured at the auditor's
// small size: 0.250 mm / 3.19 mm² of tuck movement). A full branch
// audit (instrumented Math.min/Math.max over all suite sizes) found
// 20 saturated sites; the sizes and options below flip every branch
// that validation makes reachable, and assert the flipped values
// where a panel field carries them directly.
//
// Still saturated after these sizes, by construction (no valid
// size reaches the other branch — see the batch notes):
//   tuck.ts:102 / snaplock.ts:96 leadR (tuckDepth >= 10 by its own
//     clamp, so tuckDepth/3 >= 3.33 > 2.5 always);
//   snaplock.ts:161 cham (tabW is the constant 16, so tabW/4 = 4);
//   envelope.ts:79 seal radius (H >= 25, so H/3 >= 8.33 > 6);
//   tuck.ts:31 tuck-depth floor (W >= 25, so W/2 >= 12.5 > 10;
//     the W = 25 size below still makes the floor literal's +3.0
//     mutant observable: max(13, 12.5) = 13).
//
// Correction (post-T6b audit, folded in with batch T7):
// snaplock.ts:97's notchR value branch IS reachable — this file
// originally claimed otherwise, from a tab-fit bound computed at
// a fixed thickness. The bound is thickness-dependent: tongueW
// < 30 needs L < 31 + 2t while tab-fit needs L >= (W + t)/2 + 23
// - t, and at t = 3 the window opens. Example: a 35x25x120
// snaplock at t = 3 passes checkDieline with tongueW = 28, so
// notchR = 28/6 = 4.67 takes the value branch, and the /6
// divisor's +0.5 mutant moves the top flap outline by 0.36 mm.
// The divisor mutants were already pinned below at 36x25 t0.3
// from the cap side (tongueW = 31.65: /6.5 and /9 land under the
// cap); the 35x25x120 t3 test below pins the value branch itself.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, type Dieline, type DielineType } from "../lib/dieline-gen/index.ts"

const panel = (d: Dieline, id: string) => d.panels.find((p) => p.id === id)!
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9
const shoe = (poly: { x: number; y: number }[]) => {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    a += p.x * q.y - q.x * p.y
  }
  return Math.abs(a) / 2
}
function expectFailure(d: Dieline, ...needles: string[]) {
  const failures = checkDieline(d).failures
  assert.ok(
    failures.some((f) => needles.every((n) => f.includes(n))),
    `expected a failure containing [${needles.join(" + ")}], got: ${failures.join(" | ") || "(none)"}`,
  )
}

// ---- pass: one size per flipped clamp branch --------------------
// Each entry names the clamp(s) it flips. g pins assert the glue
// panel's width field, which carries the glue clamp's result.

const FLIPS: { type: DielineType; L: number; W: number; H: number; t: number; opts?: object; flips: string; g?: number }[] = [
  { type: "mailer", L: 80, W: 55, H: 160, t: 0.5, flips: "mailer:41 ang value branch (tuckW 77.5 -> ang 7.75)" },
  { type: "mailer", L: 35, W: 55, H: 40, t: 0.5, flips: "mailer:40 notchR value branch (tuckW 32.5 -> 5.42)" },
  { type: "mailer", L: 120, W: 90, H: 30, t: 0.5, flips: "mailer:32 dust taper value branch (wallH 30.5 -> 4.575)" },
  { type: "pizza", L: 200, W: 200, H: 30, t: 0.5, flips: "pizza:29 taper value branch (wallH 30.5 -> 4.575)" },
  { type: "rsc", L: 150, W: 40, H: 80, t: 0.5, flips: "rsc:22 glue value branch + rsc:23 bevel value branch", g: 13.5 },
  { type: "pillow", L: 120, W: 80, H: 25, t: 0.5, flips: "pillow:47 glue value branch (endFlap 25.5 -> g 12.75)", g: 12.75 },
  { type: "pillow", L: 200, W: 140, H: 50, t: 0.5, opts: { glueWidth: 10 }, flips: "pillow:48 bevel value branch via glueWidth 10 (g 10 -> bevel 3.33)", g: 10 },
  { type: "sleeve", L: 100, W: 60, H: 25, t: 0.3, flips: "sleeve:23 glue value branch ((H+t)/2 = 12.65)", g: 12.65 },
  { type: "sleeve", L: 300, W: 80, H: 100, t: 1.5, opts: { glueWidth: 10 }, flips: "sleeve:24 bevel value branch via glueWidth 10 (g 10 -> bevel 3.33)", g: 10 },
  { type: "snaplock", L: 60, W: 25, H: 120, t: 0.5, flips: "snaplock:42 glue value branch (span 25.5 -> g 12.75)", g: 12.75 },
  { type: "snaplock", L: 80, W: 55, H: 160, t: 0.5, opts: { glueWidth: 10 }, flips: "snaplock:43 bevel value branch via glueWidth 10 (g 10 -> bevel 3.33)", g: 10 },
  { type: "tuck", L: 90, W: 25, H: 140, t: 0.5, flips: "tuck:42 glue value branch (span 25.5 -> g 12.75); tuck:31 floor literal observable", g: 12.75 },
  { type: "tuck", L: 90, W: 60, H: 140, t: 0.7, opts: { glueWidth: 10 }, flips: "tuck:43 bevel value branch via glueWidth 10 (g 10 -> bevel 3.33)", g: 10 },
  { type: "tuck", L: 30, W: 40, H: 120, t: 0.5, flips: "tuck:103 notchR value branch (tongueW 26.5 -> 4.42)" },
  { type: "envelope", L: 220, W: 35, H: 40, t: 0.5, flips: "envelope:30 bevel value branch (g 11.83 -> bevel 3.94)", g: 11.833333333333334 },
]
for (const f of FLIPS) {
  test(`clamp flip ${f.type} ${f.L}×${f.W}×${f.H} t${f.t}${f.opts ? " " + JSON.stringify(f.opts) : ""}: checks pass (${f.flips})`, () => {
    const d = generateDieline(f.type, { length: f.L, width: f.W, height: f.H, thickness: f.t }, f.opts)
    assert.deepEqual(checkDieline(d).failures, [])
    if (f.g !== undefined) {
      const glue = panel(d, f.type === "envelope" ? "glue-l" : "glue")
      assert.ok(near(glue.width, f.g), `glue width ${glue.width} != design ${f.g}`)
    }
  })
}

// ---- the previously unpinned gap, pinned directly ----------------------

test("mailer 80×55×160: the tuck lead-corner angle is the value branch, ang = 7.75", () => {
  // mailer.ts:41: ang = min(8, tuckW * 0.1), tuckW = L - t - 2 =
  // 77.5, so ang = 7.75 — under the cap every T6 size saturates.
  // The +0.5 mutant of the 0.1 literal (ang -> 8) moves this
  // shoulder vertex by 0.25 mm; this assertion sees it directly,
  // and the outline pin in checkDieline sees it at this size too.
  const d = generateDieline("mailer", { length: 80, width: 55, height: 160, thickness: 0.5 })
  const tuck = panel(d, "tuck")
  assert.ok(near(tuck.polygon[2].y, 7.75), `shoulder y ${tuck.polygon[2].y} != ang 7.75`)
  const last = tuck.polygon[tuck.polygon.length - 1]
  assert.ok(near(last.y, 7.75), `shoulder y ${last.y} != ang 7.75`)
})

test("negative: dropping the small mailer's lead corners to the cap angle fails the outline pin", () => {
  // The generator-side version is the mailer.ts:41 mutant itself:
  // ang 7.75 -> 8 moves both shoulder vertices +0.25 in y.
  const d = generateDieline("mailer", { length: 80, width: 55, height: 160, thickness: 0.5 })
  const tuck = panel(d, "tuck")
  tuck.polygon = tuck.polygon.map((v) => (near(v.y, 7.75) ? { x: v.x, y: 8 } : v))
  expectFailure(d, "mailer tuck flap", "design vertex")
})

// ---- glue-area pins for the flipped bevel clamps -----------------
// rsc / pillow / sleeve glue flaps share one construction: a
// g x len rectangle with the two outer corners bevelled, so the
// design area is g * len - bevel^2 exactly (the same identity the
// T6 tuck glue-area pin uses). At the flipped sizes the bevel sits
// on its value branch, so these assertions see the bevel clamp's
// literals (rsc:23, pillow:48, sleeve:24), which no other check
// observes.

test("rsc 150×40×80: glue area = g × bodyH − bevel² on the flipped branches", () => {
  const d = generateDieline("rsc", { length: 150, width: 40, height: 80, thickness: 0.5 })
  const g = Math.min(d.options.glueWidth, (40 + 0.5) / 3) // 13.5
  const bevel = Math.min(5, g / 3) // 4.5
  const glue = panel(d, "glue")
  assert.ok(Math.abs(shoe(glue.polygon) - (g * glue.height - bevel * bevel)) < 0.05,
    `glue area ${shoe(glue.polygon)} != ${g * glue.height - bevel * bevel}`)
})

test("pillow glueWidth 10: glue area = g × blankLen − bevel² on the flipped bevel branch", () => {
  const d = generateDieline("pillow", { length: 200, width: 140, height: 50, thickness: 0.5 }, { glueWidth: 10 })
  const g = 10
  const bevel = Math.min(4, g / 3) // 3.33
  const glue = panel(d, "glue")
  assert.ok(Math.abs(shoe(glue.polygon) - (g * glue.height - bevel * bevel)) < 0.05,
    `glue area ${shoe(glue.polygon)} != ${g * glue.height - bevel * bevel}`)
})

test("sleeve glueWidth 10: glue area = g × W − bevel² on the flipped bevel branch", () => {
  const d = generateDieline("sleeve", { length: 300, width: 80, height: 100, thickness: 1.5 }, { glueWidth: 10 })
  const g = 10
  const bevel = Math.min(4, g / 3) // 3.33
  const glue = panel(d, "glue")
  assert.ok(Math.abs(shoe(glue.polygon) - (g * glue.height - bevel * bevel)) < 0.05,
    `glue area ${shoe(glue.polygon)} != ${g * glue.height - bevel * bevel}`)
})

test("rsc glueWidth 20: glue area pins the bevel cap branch (bevel = 5)", () => {
  // At the default option g <= 15, so g/3 <= 5 and the rsc:23 cap
  // never binds observably; with glueWidth 20 at a wide RSC,
  // g = 20 and bevel = min(5, 6.67) = 5 — the cap binds, and its
  // mutants (5.5 / 8) move the bevelled corners.
  const d = generateDieline("rsc", { length: 400, width: 300, height: 300, thickness: 3 }, { glueWidth: 20 })
  const glue = panel(d, "glue")
  assert.ok(Math.abs(shoe(glue.polygon) - (20 * glue.height - 25)) < 0.05,
    `glue area ${shoe(glue.polygon)} != ${20 * glue.height - 25}`)
})

test("pillow 200×140×50: glue area pins the bevel cap branch (bevel = 4)", () => {
  const d = generateDieline("pillow", { length: 200, width: 140, height: 50, thickness: 0.5 })
  const glue = panel(d, "glue")
  assert.ok(Math.abs(shoe(glue.polygon) - (15 * glue.height - 16)) < 0.05,
    `glue area ${shoe(glue.polygon)} != ${15 * glue.height - 16}`)
})

test("sleeve 300×80×100: glue area pins the bevel cap branch (bevel = 4)", () => {
  const d = generateDieline("sleeve", { length: 300, width: 80, height: 100, thickness: 1.5 })
  const glue = panel(d, "glue")
  assert.ok(Math.abs(shoe(glue.polygon) - (15 * glue.height - 16)) < 0.05,
    `glue area ${shoe(glue.polygon)} != ${15 * glue.height - 16}`)
})

test("snaplock 35×25×120 t3: checks pass (snaplock:97 notchR value branch)", () => {
  // tongueW = min(35 - 2*3 - 1, closureW - 1) = 28 < 30, so
  // notchR = 28/6 = 4.67 takes the value branch (see the header
  // correction). The outline pin restates the notch circle at
  // that radius: the /6 divisor's +0.5 mutant (r = 4.31) moves
  // the flap outline by 0.36 mm and fails here.
  const d = generateDieline("snaplock", { length: 35, width: 25, height: 120, thickness: 3 })
  assert.deepEqual(checkDieline(d).failures, [])
})

test("snaplock 36×25×120 t0.3: checks pass (snaplock:97 divisor mutants observable here)", () => {
  // tongueW = 31.65: notchR = min(5, 31.65/6 = 5.275) still takes
  // the cap unmutated, but the /6 divisor's +0.5 / +3.0 mutants
  // land at 4.87 / 3.52 — under the cap — and move the notch arc,
  // which the outline pin restates. No smaller snaplock is valid
  // (tab-fit rule), so this is the tightest reachable size.
  const d = generateDieline("snaplock", { length: 36, width: 25, height: 120, thickness: 0.3 })
  assert.deepEqual(checkDieline(d).failures, [])
})

// ---- tuck floor-branch size negative ----------------------------

test("negative: rotating the W=25 tuck lead-corner samples fails the outline pin", () => {
  // At W = 25 the tuck depth is W/2 = 12.5 (the floor literal's
  // +3.0 mutant would make it 13 and move this corner); the
  // outline pin restates the corner from the design terms.
  const spec = { length: 90, width: 25, height: 140, thickness: 0.5 }
  const d = generateDieline("tuck", spec)
  const flap = panel(d, "tuck-top")
  const { length: L, width: W, thickness: t } = spec
  const sg = d.options.slotGap
  const span = W + t
  const td = Math.min(25, Math.max(10, W / 2))
  const widths = [L + t, W + t, L + t, W + t]
  const g = Math.min(d.options.glueWidth, span / 2)
  const backX = g + widths[0] + widths[1]
  const closureW = widths[2] - sg
  const tongueW = Math.min(L - 2 * t - 1, closureW - 1)
  const tx0 = backX + (widths[2] - tongueW) / 2
  const leadR = Math.min(2.5, td / 3)
  const tubeTop = span + td
  const c = { x: tx0 + tongueW - leadR, y: tubeTop - (span + td - leadR) }
  const rot = (v: { x: number; y: number }, deg: number) => {
    const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a)
    const dx = v.x - c.x, dy = v.y - c.y
    return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
  }
  flap.polygon = flap.polygon.map((v) => (Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - leadR) <= 0.05 ? rot(v, 3) : v))
  expectFailure(d, "tuck flap tuck-top", "design vertex")
})
