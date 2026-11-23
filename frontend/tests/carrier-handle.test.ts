import {test} from 'node:test'
import assert from 'node:assert/strict'
import {carrierHandleCurve,createCarrierRibbon} from '../lib/editor/geometry/carrier-handle.ts'
test('handle ends embed below the bag rim while the loop rises above it',()=>{
 const c=carrierHandleCurve(1.8,1.4);assert.ok(c.getPoint(0).y<1.4);assert.ok(c.getPoint(1).y<1.4);assert.ok(c.getPoint(.5).y>1.4);assert.equal(c.getPoint(0).x,-c.getPoint(1).x)
})
test('ribbon is a finite twisting strip rather than a solid cut-out arch',()=>{
 const g=createCarrierRibbon(1.8,1.4),p=g.getAttribute('position'),n=g.getAttribute('normal');assert.equal(p.count,194)
 for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)))
 assert.ok(Math.abs(p.getZ(96))>.04);g.dispose()
})
