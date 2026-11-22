import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8")

test("dieline shows store artwork on outside panels, display only", () => {
  const canvas = read("components/editor/canvas/DielineCanvas.tsx")
  assert.equal(canvas.includes("s.layers"), true, "DielineCanvas must read layers from the store")
  assert.equal(canvas.includes("generateTextureFromLayers"), true)
  assert.equal(canvas.includes("faceArtwork={faceArtwork}"), true)

  const view = read("components/editor/canvas/DielineView.tsx")
  assert.equal(view.includes("data-dieline-artwork"), true)
  assert.equal(view.includes("faceArtwork?.[faceId]"), true, "inside print is reachable through the print-side toggle")
  assert.equal(view.includes("data-print-side-toggle"), true)
  assert.equal(canvas.includes('product?.support === "deferred"'), true, "deferred products never get artwork")
  assert.equal(view.includes("data-artwork-withheld"), true, "rotated panels must withhold artwork visibly")
  assert.equal(canvas.includes("dimsMatch"), true, "stale-dimension geometry must withhold artwork")
  const exportBlock = /const handleExport = \(\) => \{([\s\S]*?)\n  \}\n/.exec(view)?.[1] ?? ""
  assert.equal(exportBlock.includes("faceArtwork"), false, "SVG export must not include artwork")
})
