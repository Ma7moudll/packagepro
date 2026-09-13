import { test } from "node:test"
import assert from "node:assert/strict"
import type { DielineBlueprint, DielineGeometry } from "../../shared/types/index.ts"
import { resolveDieline } from "../lib/editor/geometry/resolve-dieline.ts"
import { serializeSVG } from "../lib/editor/services/dieline-service.ts"
import {
  assessCertification,
  assembleDielineDelivery,
  canonicalSvg,
  canonicalPersistedGeometry,
  canonicalLiveGeometry,
  artifactsMatch,
  dielineExportFileName,
  isUnverifiable,
} from "../lib/editor/services/certified-export.ts"

// M8-J: certified dieline delivery contract (M8_PLAN M8-J).
//
//   A  deterministic file name (dieline-<boxType>.svg, no timestamps/UUIDs)
//   B  no prepress result           -> NOT_CERTIFIED (cannot certify)
//   C  live bytes != certified bytes -> NOT_CERTIFIED even when result.passed
//   D  stale certification (design saved after the check) -> NOT_CERTIFIED;
//      a check at the same instant is still current
//   E  failed check                -> FAILED
//   F  UNVERIFIABLE verdict        -> UNVERIFIABLE — never marketed as a pass
//   G  clean pass + coverage       -> CERTIFIED
//   H  delivery happens only when CERTIFIED: returns canonical mm SVG + name + bytes
//   I  blocked delivery never carries an svg payload, name stays deterministic
//   J  CERTIFIED but no geometry   -> unavailable
//   K  canonical geometry is single-sourced: snapshot is preferred, live re-resolves
//      through the canonical point, and snapshots must be byte-identical to certify
//   L  blueprint+dims fallback resolves through resolveDieline (no math here)

const MAILER_DIMS = { length: 115, width: 70, height: 38 }

const mailerBlueprint: DielineBlueprint = {
  schemaVersion: 1,
  boxType: "mailer-box",
  faceOrder: ["left", "front", "right", "back", "top", "bottom"],
  panels: {
    left: { faceId: "left", x: 0, y: 70, w: 70, h: 38, rotation: 0, edges: { top: { class: "glue", to: "glue_flap" }, right: { class: "fold", to: "front" }, bottom: { class: "glue", to: "glue_flap" }, left: { class: "cut" } } },
    front: { faceId: "front", x: 70, y: 70, w: 115, h: 38, rotation: 0, edges: { top: { class: "fold", to: "top" }, right: { class: "fold", to: "right" }, bottom: { class: "fold", to: "bottom" }, left: { class: "fold", to: "left" } } },
    right: { faceId: "right", x: 185, y: 70, w: 70, h: 38, rotation: 0, edges: { top: { class: "glue", to: "glue_flap" }, right: { class: "fold", to: "back" }, bottom: { class: "glue", to: "glue_flap" }, left: { class: "fold", to: "front" } } },
    back: { faceId: "back", x: 255, y: 70, w: 115, h: 38, rotation: 0, edges: { top: { class: "cut" }, right: { class: "glue", to: "left" }, bottom: { class: "cut" }, left: { class: "fold", to: "right" } } },
    top: { faceId: "top", x: 70, y: 0, w: 115, h: 70, rotation: 0, edges: { top: { class: "cut" }, right: { class: "cut" }, bottom: { class: "fold", to: "front" }, left: { class: "cut" } } },
    bottom: { faceId: "bottom", x: 70, y: 108, w: 115, h: 70, rotation: 0, edges: { top: { class: "fold", to: "front" }, right: { class: "cut" }, bottom: { class: "cut" }, left: { class: "cut" } } },
    inside_front: { faceId: "inside_front", x: 70, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    inside_back: { faceId: "inside_back", x: 255, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    inside_left: { faceId: "inside_left", x: 0, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    inside_right: { faceId: "inside_right", x: 185, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    inside_top: { faceId: "inside_top", x: 70, y: 0, w: 115, h: 70, rotation: 0, edges: {} },
    inside_bottom: { faceId: "inside_bottom", x: 70, y: 108, w: 115, h: 70, rotation: 0, edges: {} },
  },
  outline: { w: 370, h: 178 },
}

const PASS = {
  passed: true,
  checkedAt: "2026-09-13T10:00:00.000Z",
  issues: [],
}

function geometry(): DielineGeometry {
  const resolution = resolveDieline(mailerBlueprint, MAILER_DIMS)
  assert.equal(resolution.ok, true, "F42 fixture must resolve")
  return (resolution as { ok: true; geometry: DielineGeometry }).geometry
}

test("A: dieline file names are deterministic and mangle unsupported characters", () => {
  assert.equal(dielineExportFileName("mailer-box"), "dieline-mailer-box.svg")
  assert.equal(dielineExportFileName("Folding Carton"), "dieline-folding-carton.svg")
  assert.equal(dielineExportFileName("custom/mailer!box"), "dieline-custom-mailer-box.svg")
  assert.equal(dielineExportFileName(""), "dieline-dieline.svg")
  assert.equal(dielineExportFileName(undefined), "dieline-dieline.svg")
  assert.equal(/[0-9]{13}/.test(dielineExportFileName("mailer-box")), false)
})

test("B: no prepress result -> NOT_CERTIFIED", () => {
  const a = assessCertification(null, true, "2026-09-13T09:00:00.000Z")
  assert.equal(a.status, "NOT_CERTIFIED")
  assert.match(a.reason, /no prepress certification/i)
})

test("C: live bytes differing from the certified snapshot -> NOT_CERTIFIED even if passed", () => {
  const a = assessCertification(PASS, false, "2026-09-13T09:00:00.000Z")
  assert.equal(a.status, "NOT_CERTIFIED")
  assert.match(a.reason, /stale/i)
  assert.match(a.detail ?? "", /bytes differ/i)
})

test("D: stale certification gates a silent pass; same-instant stays current", () => {
  const stale = assessCertification(PASS, true, "2026-09-13T11:00:00.000Z")
  assert.equal(stale.status, "NOT_CERTIFIED")
  assert.match(stale.reason, /stale/i)
  const current = assessCertification(PASS, true, "2026-09-13T10:00:00.000Z")
  assert.equal(current.status, "CERTIFIED")
})

test("E: failed check -> FAILED", () => {
  const failed = assessCertification(
    { passed: false, checkedAt: PASS.checkedAt, issues: [{ type: "resolution", severity: "error", message: "blurry" }] },
    true,
    "2026-09-13T09:00:00.000Z"
  )
  assert.equal(failed.status, "FAILED")
})

test("F: an UNVERIFIABLE verdict is never marketed as a pass", () => {
  const unverified = assessCertification(
    { passed: true, checkedAt: PASS.checkedAt, issues: [{ type: "resolution", severity: "warning", message: "Resolution is UNVERIFIABLE for vector files" }] },
    true,
    "2026-09-13T09:00:00.000Z"
  )
  assert.equal(unverified.status, "UNVERIFIABLE")
  assert.equal(isUnverifiable({ issues: [{ message: "governing UNVERIFIABLE" }] }), true)
})

test("G: clean pass + coverage -> CERTIFIED", () => {
  const a = assessCertification(PASS, true, "2026-09-13T09:00:00.000Z")
  assert.equal(a.status, "CERTIFIED")
})

test("H: delivery happens only when CERTIFIED and yields the canonical mm SVG", () => {
  const g = geometry()
  const delivered = assembleDielineDelivery({
    geometry: g,
    boxType: "mailer-box",
    assessment: assessCertification(PASS, true, "2026-09-13T09:00:00.000Z"),
    checkedAt: PASS.checkedAt,
  })
  assert.equal(delivered.status, "delivered")
  const d = delivered as {
    status: "delivered"
    svg: string
    fileName: string
    bytes: number
    certification: { status: "CERTIFIED"; checkedAt: string | null; reason: string }
  }
  assert.equal(d.fileName, "dieline-mailer-box.svg")
  assert.equal(d.certification.status, "CERTIFIED")
  assert.equal(d.certification.checkedAt, PASS.checkedAt)
  assert.equal(d.svg, serializeSVG(g), "bytes equal the canonical serializer output")
  assert.ok(d.bytes > 0)
  assert.match(d.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
  assert.equal(/px/.test(d.svg), false, "zero px in the delivery")
  assert.match(d.svg, /data-face-id="front"/)
})

test("I: blocked delivery never carries an svg payload, but keeps the deterministic name", () => {
  for (const assessment of [
    assessCertification({ passed: false, checkedAt: PASS.checkedAt, issues: [] }, true, "2026-09-13T09:00:00.000Z"),
    assessCertification(null, true, "2026-09-13T09:00:00.000Z"),
  ]) {
    const blocked = assembleDielineDelivery({
      geometry: geometry(),
      boxType: "mailer-box",
      assessment,
    })
    assert.equal(blocked.status, "blocked_certification")
    const b = blocked as { status: "blocked_certification"; fileName: string }
    assert.equal(b.fileName, "dieline-mailer-box.svg")
    // a blocked result carries no serialized bytes
    assert.equal("svg" in (blocked as { svg?: string }), false)
  }
})

test("J: CERTIFIED assessment without geometry -> unavailable", () => {
  const unavailable = assembleDielineDelivery({
    geometry: null,
    boxType: "mailer-box",
    assessment: assessCertification(PASS, true, "2026-09-13T09:00:00.000Z"),
  })
  assert.equal(unavailable.status, "unavailable")
})

test("K: single-sourced canonical geometry — snapshot preferred, live equality required", () => {
  const saved = geometry()
  const viaSnapshot = canonicalPersistedGeometry({ snapshot: saved, blueprint: mailerBlueprint, dims: MAILER_DIMS })
  const viaBlueprint = canonicalPersistedGeometry({ snapshot: null, blueprint: mailerBlueprint, dims: MAILER_DIMS })
  const live = canonicalLiveGeometry({ blueprint: mailerBlueprint, dims: MAILER_DIMS })
  assert.ok(viaSnapshot)
  assert.ok(viaBlueprint)
  assert.ok(live)
  assert.equal(artifactsMatch(canonicalSvg(viaSnapshot!), canonicalSvg(saved)), true)
  assert.equal(artifactsMatch(canonicalSvg(viaBlueprint!), canonicalSvg(live!)), true, "snapshot and re-resolution agree")
})

test("L: no blueprint/dims -> no geometry, and no math happens here", () => {
  assert.equal(canonicalPersistedGeometry({ snapshot: null, blueprint: null, dims: MAILER_DIMS }), null)
  assert.equal(canonicalPersistedGeometry({ snapshot: null, blueprint: mailerBlueprint, dims: null }), null)
  const same = geometry()
  const cloned = structuredClone(same)
  assert.equal(artifactsMatch(canonicalSvg(same), canonicalSvg(cloned)), true)
})