import { test } from "node:test"
import assert from "node:assert/strict"
import * as THREE from "three"
import { createMailerPanel, mailerConstruction } from "../lib/editor/geometry/mailer-construction.ts"

test("mailer scene uses 2 mm board at normal sizes, with safe tiny-box clearances", () => {
  assert.equal(mailerConstruction(2,1.5,1).thickness * 100, 2)
  for (const [l,w,h] of [[2,1.5,1],[1.15,.7,.38],[.3,.2,.1],[6,4,3]]) {
    const c=mailerConstruction(l,w,h)
    assert.ok(c.thickness > 0 && c.thickness < Math.min(l,w,h)/10)
    assert.ok(l-c.thickness*6.4 > 0)
    assert.ok(c.wingDepth < h && c.tuckDepth < h)
  }
})

test("all die-cut profiles have finite geometry and separate outside/inside/cut material groups", () => {
  for (const profile of ["rounded","tuck","wing","notch"] as const) {
    const g=createMailerPanel(2,1,.02,profile)
    const p=g.getAttribute("position"), n=g.getAttribute("normal")
    assert.ok(g.groups.length <= 5, "contiguous groups avoid per-triangle draw calls")
    assert.deepEqual([...new Set(g.groups.map(x=>x.materialIndex))].sort(),[0,1,2])
    for(let i=0;i<p.count;i++) assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)))
    for(const group of g.groups) for(let i=group.start;i<group.start+group.count;i++) {
      if(group.materialIndex===0) assert.ok(n.getZ(i)>.99)
      if(group.materialIndex===1) assert.ok(n.getZ(i)<-.99)
    }
    g.dispose()
  }
})

test("front thumb notch is a real opening, not a painted circle", () => {
  const g=createMailerPanel(2,1,.02,"notch")
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))
  const hit=(x:number,y:number)=>new THREE.Raycaster(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1)).intersectObject(m).length
  assert.equal(hit(0,.47),0)
  assert.ok(hit(.3,.47)>0)
  assert.ok(hit(0,.25)>0)
  g.dispose(); (m.material as THREE.Material).dispose()
})

test("cap UVs preserve rectangular artwork coordinates across shaped panels", () => {
  const g=createMailerPanel(2,1,.02,"tuck"), p=g.getAttribute("position"), uv=g.getAttribute("uv")
  for(const group of g.groups.filter(x=>x.materialIndex===0)) for(let i=group.start;i<group.start+group.count;i++) {
    assert.ok(Math.abs(uv.getX(i)-(p.getX(i)+1)/2)<1e-6)
    assert.ok(Math.abs(uv.getY(i)-(p.getY(i)+.5))<1e-6)
  }
  g.dispose()
})
