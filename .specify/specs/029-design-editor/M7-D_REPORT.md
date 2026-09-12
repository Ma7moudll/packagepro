# M7-D — Physical 3D Face Picking → Real Face ID → 2D Face Editor

**Status:** PASS
**Milestone:** M7-D (End-to-End Editorial — bidirectional 3D↔2D face mapping)
**Date:** 2026-09-12
**Previous:** M7-C (per-face multipurpose artwork) CLOSED — no regressions
**Scope boundary:** Stop after M7-D. No M7-E / M8 work performed.

---

## Verdict

The milestone is **PASS**. Real raycast picking on the 3D mesh now resolves to the
physically-nearest printable surface, maps it to a stable `ProductStructure` Face ID,
activates that exact face in the 2D editor, and preserves M7-C per-face artwork
isolation across 2D↔3D hops. Full e2e suite: **31 passed × 3 consecutive runs, 0 failed**.

---

## What M7-D required

1. A real 3D click resolves to the physical surface under the cursor.
2. That surface maps to a stable Face ID from `ProductStructure.model.faces`
   (no normals guessing, mesh array indices, or hard-coded coordinates).
3. The picked face activates the correct face in the 2D editor.
4. Orbit/rotate drag must never fire a selection.
5. Existing M7-C behaviour (independent per-face artwork) survives the 2D→3D→2D round trip.

## What M7-D does NOT do

- Doesn't add product features (customer/vendor portals, admin dashboard — those belong
  to the SPEC-029 frontend plans, out of scope here).
- No "mock/cheat" picks: every harness probe drives the real `THREE.Raycaster` against
  the real scene and camera.

---

## Architecture

### Face identity (single source of truth)

- `BoxModels.tsx` tags every printable mesh with `mesh.userData.faceId` (stable IDs:
  `front, back, left, right, top, bottom` + `inside_*` siblings where the product has
  inside faces).
- Validity is enforced against `ProductStructure.model.faces` via `useFaceValidity()`;
  `inside_*` resolves to its outer sibling.
- The 3D pick path, the E2E harness, and the texture keying all consume the **same**
  `faceId` values, so 2D artwork maps deterministically onto the picked 3D face (`FaceHighlight`
  + per-face generated textures keyed by ID).

### Physical-surface resolution (the fix in this milestone)

A single pointer click in react-three-fiber bubbles **one event per intersected descendant
mesh, in distance order**. The group's `onClick` therefore fires N times for one click
(measured: 3 times — `top@2.69`, `top@3.08`, `bottom@3.90`), and the previous
implementation read the single `e.object`, which was last-write-wins and selected the
**farthest** face.

`handleFaceSelect` (DesignCanvas3D) now resolves from `e.intersections` (already sorted by
distance) and picks the **nearest hit carrying a valid `userData.faceId`**:

```ts
const nearestTagged = (e.intersections as any[])
  .map(h => ({ faceId: h?.object?.userData?.faceId, distance: h?.distance }))
  .find(h => h.faceId && isValidFace(h.faceId))
if (!nearestTagged) return
setSelectedFace(nearestTagged.faceId)
```

This makes the product's click resolution and the test harness agree by construction:
the harness probe (`__editorPickFace*`) returns the first tagged hit of the same real
raycast, i.e. both select the visibly-hovered surface.

### Drag guard

`typeof e.delta === "number" && e.delta > 6 → return` — orbiting/rotating the camera never
selects a face.

### Turntable harness

The box does not auto-rotate on its own. For determinism, `SpinBox` rotates the model
group (`g.rotation.y += delta * 0.5`) and exposes `__editorSpinBox { active, speed, yOverride }`
so tests can pin or freeze the azimuth.

### E2E harness (`PickBridge`)

Exposed only in the editor, cleaned up on unmount, driving the **real** raycaster against
the **real** scene/camera:

| API | Purpose |
|---|---|
| `__editorPickFace(cx, cy[, {apply}])` | client px → NDC → first tagged raycast hit |
| `__editorPickFaceAt(ndcX, ndcY[, {apply}])` | explicit NDC, same path |
| `__editorPickScan({step})` | NDC grid scan; distinct visible faceIds + a hit NDC each |
| `__editor3DFaces()` | per tagged mesh position / NDC / visibility |
| `__editorSpinBox` | pin (yOverride) or freeze (active=false) the model rotation |
| `__editorSetFace` | drive the 2D path (closed-loop 2D→3D checks) |

First milestone iteration was blocked because `pickAtNdc` built the raycaster but never
called `setFromCamera()` — every probe cast the degenerate origin ray (inside the box,
backface-culled) and returned `null`. This was root-caused with a temporary debug spec
(`9 faces, all valid NDC/visible, probes null`) and fixed.

---

## Tests (`frontend/e2e/m7-d-face-picking.spec.ts`, serial)

| Test | What it proves | Status |
|---|---|---|
| **A** | A real raycast on a physical surface resolves to its ProductStructure Face ID (scan finds distinct tagged faces; picking applies the same `setSelectedFace` path) | PASS |
| **B** | Distinct physical surfaces resolve to distinct stable Face IDs across pinned rotations | PASS |
| **C** | Picking a physical face activates that exact face in the 2D editor (`ui.selectedFace` + visible fabric face) | PASS |
| **D** | Orbit drag (move >6px) never selects; a real click on the canvas selects the visually-hovered surface (frozen spin + post-click raycast readback) | PASS |
| **E** | 2D artwork maps onto the picked 3D face; M7-C per-face isolation survives repeated 2D↔3D hops | PASS |

### Key debug evidence (root cause)

Patched `THREE.Raycaster.prototype.intersectObject` inside the page captured r3f's raw
hits; hover (`onPointerMove`) and click agreed:
`intersectionsCount: 3`, `eObjectFace: "bottom"`, while raw hits = `[top@2.69, top@3.08,
bottom@3.90, …]`. Confirmed the handler-fires-per-mesh behaviour and validated the
nearest-tagged fix (click then selects `top`).

All debug instrumentation was removed from the source after verification.

---

## Runs

| Run | Result |
|---|---|
| `npx playwright test` (full suite) | **31 passed** (26 baseline + 5 M7-D), 0 failed |
| `npx playwright test` (full suite) | **31 passed**, 0 failed |
| `npx playwright test` (full suite) | **31 passed**, 0 failed |
| `npx tsc --noEmit` | clean, before and after all changes |

M7-C tests included and green across all three runs (no regression).

---

## Files changed (this milestone)

- `frontend/components/editor/canvas/DesignCanvas3D.tsx`
  - `handleFaceSelect`: nearest-tagged resolution from `e.intersections` (was `e.object` last-write-wins).
  - `PickBridge`: `__editorPickFace*`, `__editorPickScan`, `__editor3DFaces`; `setFromCamera` fix.
  - `SpinBox` + `__editorSpinBox` (turntable harness).
- `frontend/e2e/m7-d-face-picking.spec.ts` — new serial A–E suite.
- `frontend/e2e/helpers.ts` — unchanged (reused `loginViaApi`, `waitForEditor`, `editorState`, …).

Temporary debug spec `e2e/tmp-debug.spec.ts` and in-app debug hooks were deleted.

---

## Limitations / notes

- Selection is resolved as "nearest tagged surface" — under overlapping flaps the flap that
  is physically closest to the camera wins, which matches what the user sees.
- Multiple `onClick` deliveries per click are harmless now (idempotent), but the same
  nearest-tagged rule should be applied to any future direct-mesh `onPointerOver` hover
  highlight for consistency.
- M7-D intentionally omitted for now: smooth hover highlighting, face-edge swipe selection,
  and multi-select.

STOP / scope: milestone complete. Move-on candidates (NOT started) are gated behind the
SPEC-029 frontend plan and the project owner's go-ahead.