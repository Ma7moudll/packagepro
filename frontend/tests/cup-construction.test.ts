import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {cupConstruction,cupRadius,createCupHalf,createCupSeam} from '../lib/editor/geometry/cup-construction.ts'
for(const clear of [false,true])test(`cup ${clear?'clear':'paper'} has bounded open walls, readable half-wrap UVs and a recessed floor`,()=>{
 const c=cupConstruction(.8,.9,1,clear)
 assert.ok(c.floor>c.thickness&&c.wallTop<c.height)
 for(const back of [false,true])for(const inside of [false,true]){
  const g=createCupHalf(c,back,inside),p=g.getAttribute('position'),uv=g.getAttribute('uv'),n=g.getAttribute('normal')
  for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)))
  assert.equal(uv.getX(0),inside?1:0);assert.equal(uv.getX(40),inside?0:1)
  assert.ok(Math.abs(p.getX(20))<1e-6)
  assert.equal(Math.sign(p.getZ(20)),back?-1:1)
  assert.equal(Math.sign(n.getZ(20)),(inside?-1:1)*(back?-1:1))
  assert.ok(Math.abs(g.boundingBox!.max.y-c.wallTop)<1e-6)
  if(inside)assert.ok(Math.abs(g.boundingBox!.min.y-c.floor)<1e-6)
  g.dispose()
 }
 const seam=createCupSeam(c);assert.ok(seam.boundingBox!.max.z<0);seam.dispose()
 assert.ok(cupRadius(c,c.floor)>0)
})
test('invalid cup dimensions fail before geometry is created',()=>{for(const d of [0,-1,NaN,Infinity])assert.throws(()=>cupConstruction(d,.9,1),RangeError)})
test('clear cup artwork uses original alpha textures, not an opaque board print material',()=>{
 const source=readFileSync('components/design-editor/models/CupConstruction.tsx','utf8')
 assert.match(source,/source=\{textures\?\.\[face\]\}/)
 assert.match(source,/new THREE.TextureLoader\(\).load\(source\)/)
 assert.match(source,/alphaTest:\.015/)
 assert.match(source,/ink\?\.texture.dispose/)
 assert.match(source,/castShadow=\{!clear\}/)
})
