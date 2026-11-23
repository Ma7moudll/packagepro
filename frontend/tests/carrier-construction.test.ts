import {test} from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {carrierMounts,createCarrierWall,createCarrierGusset} from '../lib/editor/geometry/carrier-construction.ts'
import {carrierHandleCurve,createCarrierRibbonKnot} from '../lib/editor/geometry/carrier-handle.ts'
for(const style of ['none','twisted_paper','cotton_ropes','ribbon'] as const)test(`carrier ${style} has bounded paper geometry and real style-specific holes`,()=>{
 const l=1.8,h=1.4,g=createCarrierWall(l,.6,h,.002,style),p=g.getAttribute('position'),uv=g.getAttribute('uv'),m=carrierMounts(l,h,style)
 assert.deepEqual([...new Set(g.groups.map(s=>s.materialIndex))].sort(),[0,1,2])
 for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+uv.getX(i)+uv.getY(i)))
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(g,material)
 mesh.updateMatrixWorld()
 const hits=(x:number,y:number)=>new THREE.Raycaster(new THREE.Vector3(x,y,1),new THREE.Vector3(0,0,-1)).intersectObject(mesh).length
 assert.equal(hits(m.span,m.y)>0,!m.punched)
 assert.ok(hits(0,h*.5)>0)
 if(m.punched){const turn=createCarrierWall(l,.6,h,.002,style,true),rim=new THREE.Mesh(turn,material);rim.updateMatrixWorld();assert.equal(new THREE.Raycaster(new THREE.Vector3(m.span,m.y,1),new THREE.Vector3(0,0,-1)).intersectObject(rim).length,0);turn.dispose()}
 g.dispose();material.dispose()
})
test('carrier gusset opens out at the bottom and folds inward at the rim',()=>{
 for(const side of [-1,1])for(const front of [-1,1]){
  const g=createCarrierGusset(1.8,.6,1.4,side,front),p=g.getAttribute('position'),n=g.getAttribute('normal')
  assert.ok(Math.abs(p.getX(8)-side*.9)<1e-6)
  assert.ok(Math.abs(p.getX(p.count-1))<.9-.05)
  for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)))
  assert.ok(n.getX(60)*side>0);g.dispose()
 }
})
test('threaded handles terminate inside the paper and ribbon knots stay flat bands',()=>{
 for(const style of ['cotton_ropes','ribbon'] as const){const c=carrierHandleCurve(1.8,1.4,style);assert.ok(c.getPoint(0).z<0&&c.getPoint(1).z<0);assert.ok(c.getPoint(.5).z>0)}
 const g=createCarrierRibbonKnot(1.8,1.4);assert.equal(g.getAttribute('position').count,130)
 for(const value of g.getAttribute('position').array)assert.ok(Number.isFinite(value));g.dispose()
})


test('warped paper has no T-junction outlines across the printable body',()=>{
 for(const style of ['none','twisted_paper','cotton_ropes','ribbon'] as const){
  const l=1.8,h=1.4,g=createCarrierWall(l,.6,h,.002,style),edges=new THREE.EdgesGeometry(g,30),p=edges.getAttribute('position')
  for(let i=0;i<p.count;i+=2){
   const inBody=(j:number)=>Math.abs(p.getX(j))<l/2-.001&&p.getY(j)>.01&&p.getY(j)<h*.85
   assert.equal(inBody(i)&&inBody(i+1),false,style+' must not expose internal face triangulation')
  }
  edges.dispose();g.dispose()
 }
})


test('inner gussets reverse winding and U so inside artwork reads correctly',()=>{
 const outside=createCarrierGusset(1.8,.6,1.4,1,1),inside=createCarrierGusset(1.8,.6,1.4,1,1,true)
 const a=outside.getAttribute('uv'),b=inside.getAttribute('uv'),n=outside.getAttribute('normal'),ni=inside.getAttribute('normal')
 for(let i=0;i<a.count;i++){assert.ok(Math.abs(a.getX(i)+b.getX(i)-1)<1e-6);assert.ok(n.getX(i)*ni.getX(i)<0)}
 outside.dispose();inside.dispose()
})
