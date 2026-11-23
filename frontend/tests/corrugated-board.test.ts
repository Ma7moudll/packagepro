import {test} from 'node:test'
import * as THREE from 'three'
import assert from 'node:assert/strict'
import {corrugatedSection,createCorrugatedCore} from '../lib/editor/geometry/corrugated-board.ts'
test('corrugated core leaves space for two separate liners',()=>{
 const b=.028,s=corrugatedSection(b)
 assert.ok(Math.abs(2*s.skin+s.paper+2*s.amplitude-b)<1e-12)
 assert.ok(s.skin>0&&s.paper>0&&s.amplitude>0&&s.pitch>b)
})
for(const axis of ['x','y'] as const)test(`physical flute sheet is finite with bounded thickness and ${axis} channels`,()=>{
 const b=.028,g=createCorrugatedCore(2.5,1.5,b,axis),p=g.getAttribute('position'),n=g.getAttribute('normal'),index=g.getIndex()!
 assert.ok(p.count>100&&index.count>p.count)
 for(let i=0;i<p.count;i++){
  assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)))
  assert.ok(Math.abs(p.getZ(i))<=b/2-corrugatedSection(b).skin+1e-6)
 }
 const box=g.boundingBox!
 assert.ok(Math.abs(box.max.x-box.min.x-2.5)<.003)
 assert.ok(Math.abs(box.max.y-box.min.y-1.5)<.003)
 assert.ok(box.max.z-box.min.z>b*.6)
 g.dispose()
})
test('invalid corrugated dimensions are rejected before generating geometry',()=>{
 for(const d of [0,-1,NaN,Infinity])assert.throws(()=>createCorrugatedCore(d,1,.028),RangeError)
})

test('rendered core stays at exposed cut-edge depths, never behind the covered liner centre',async()=>{
 const {createCorrugatedCutEdges}=await import('../lib/editor/geometry/corrugated-board.ts')
 for(const axis of ['x','y'] as const){
  const w=2.5,h=1.5,b=.028,lip=b*.65,g=createCorrugatedCutEdges(w,h,b,axis),p=g.getAttribute('position')
  for(let i=0;i<p.count;i++){
   assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)))
   assert.ok(Math.abs(p.getX(i))>w/2-lip-.002||Math.abs(p.getY(i))>h/2-lip-.002)
  }
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(g,material)
  mesh.updateMatrixWorld()
  assert.equal(new THREE.Raycaster(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)).intersectObject(mesh).length,0)
  g.dispose();material.dispose()
 }
})


test('thin liner detail can be reduced without losing print/cut-edge groups',async()=>{
 const {createMailerPanel}=await import('../lib/editor/geometry/mailer-construction.ts')
 const full=createMailerPanel(2.5,1.5,.0028,'rounded',.00056),thin=createMailerPanel(2.5,1.5,.0028,'rounded',.00056,4)
 assert.ok(thin.getAttribute('position').count<full.getAttribute('position').count/2)
 assert.deepEqual([...new Set(thin.groups.map(g=>g.materialIndex))].sort(),[0,1,2])
 full.dispose();thin.dispose()
})
