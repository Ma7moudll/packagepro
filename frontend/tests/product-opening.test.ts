import {test} from 'node:test'
import assert from 'node:assert/strict'
import {productOpeningStep} from '../lib/editor/geometry/product-opening.ts'
test('product opening moves monotonically without teleporting or overshooting',()=>{
 for(const [start,end] of [[0,1],[1,0],[.3,.7]]){let x=start;for(let i=0;i<120;i++){const next=productOpeningStep(x,end,1/60);assert.ok(next>=Math.min(start,end)&&next<=Math.max(start,end));if(i===0)assert.notEqual(next,end);assert.ok(Math.abs(end-next)<=Math.abs(end-x));x=next}assert.equal(x,end)}
})
test('reduced motion is immediate and long frames stay bounded',()=>{assert.equal(productOpeningStep(0,1,.016,true),1);assert.ok(productOpeningStep(0,1,4)<1);assert.equal(productOpeningStep(0,1,-1),0)})
