// Batch AZ2 — the SVG draws the film features (seal, zip, notch, valve)
// in their own "film" layer, not in the cut layer. Before this, a pouch or
// bag rendered as three plain panels with every feature missing.
import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, renderDielineSvg } from "../lib/dieline-gen/index.ts"

const grab = (svg: string, id: string) => (svg.match(new RegExp(`<g id="${id}"[^>]*>([\\s\\S]*?)</g>`)) ?? [, ""])[1]
const count = (s: string, kind: string) => (s.match(new RegExp(`data-kind="${kind}"`, "g")) ?? []).length

test("pouch with zip, notches and valve: every feature is in the film layer, none in the cut layer", () => {
  const d = generateDieline("pouch", { length: 130, width: 70, height: 200, thickness: 0.3 }, { zipHeight: 15, tearNotch: true, valve: true })
  const svg = renderDielineSvg(d)
  const film = grab(svg, "film")
  assert.equal(film.match(/<rect /g)!.length, d.features.length)
  assert.equal(count(film, "seal"), d.features.filter((f) => f.kind === "seal").length)
  assert.equal(count(film, "zip"), 2)
  assert.equal(count(film, "notch"), 2)
  assert.equal(count(film, "valve"), 1)
  assert.ok(!grab(svg, "cut").includes("<rect"), "no film feature in the cut layer")
})
test("bag: seals are drawn; box types draw no film layer", () => {
  const bag = renderDielineSvg(generateDieline("bag", { length: 250, width: 350, height: 0.5, thickness: 0.5 }))
  assert.equal(count(grab(bag, "film"), "seal"), 3)
  assert.ok(!renderDielineSvg(generateDieline("rsc", { length: 120, width: 90, height: 100, thickness: 2 })).includes('id="film"'))
})
test("film rect geometry equals the feature rectangle", () => {
  const d = generateDieline("pouch", { length: 130, width: 70, height: 200, thickness: 0.3 })
  const f = d.features[0]
  const svg = renderDielineSvg(d)
  const r = Number(svg.match(/<rect data-kind="seal" x="([-\d.]+)"/)![1])
  assert.ok(Math.abs(r - (f.at.x - f.w / 2)) < 0.006)
})
