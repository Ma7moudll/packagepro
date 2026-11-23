import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createPouchSurface} from '../lib/editor/geometry/pouch-preview.ts'
test('flexible pouch surfaces bulge only within dimensions and seal at perimeter',()=>{
 for(const back of [false,true]){
  const g=createPouchSurface(1.8,2.4,.6,back),p=g.getAttribute('position'),uv=g.getAttribute('uv'),n=g.getAttribute('normal')
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i)
   assert.ok(Number.isFinite(x+y+z));assert.ok(Math.abs(x)<=.90001);assert.ok(y>=0&&y<=2.40001);assert.ok(Math.abs(z)<=.30201)
   assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1);assert.ok(uv.getY(i)>=0&&uv.getY(i)<=1)
   assert.ok(back?n.getZ(i)<0:n.getZ(i)>0)
   if(y<.00001||Math.abs(y-2.4)<.00001)assert.ok(Math.abs(z)<.0021)
  }
  g.dispose()
 }
})
