import {test} from 'node:test'
import assert from 'node:assert/strict'
import {productOpeningFraming,reframeOpeningCamera} from '../lib/editor/geometry/product-opening-camera.ts'
const dims={length:250,width:200,height:180}
test('only opening constructions change framing, never a film flap or open-top carrier',()=>{
 for(const family of ['mailer-bag','bag','cup','pouch','flat','label',undefined] as const)assert.deepEqual(productOpeningFraming(family,dims,1),{scale:1,lift:0})
 for(const family of ['mailer','shipping','rigid','carton','pizza','tube','envelope'] as const){assert.deepEqual(productOpeningFraming(family,dims,0),{scale:1,lift:0});const half=productOpeningFraming(family,dims,.5),full=productOpeningFraming(family,dims,1);assert.ok(half.scale>1&&full.scale>half.scale);assert.ok(full.lift>half.lift)}
})
test('mailer retains its established full-open allowance and invalid progress is bounded',()=>{
 assert.deepEqual(productOpeningFraming('mailer',dims,1),{scale:1.55,lift:1.8*.3})
 assert.deepEqual(productOpeningFraming('pizza',dims,2),productOpeningFraming('pizza',dims,1))
 assert.deepEqual(productOpeningFraming('pizza',dims,NaN),{scale:1,lift:0})
})
test('opening then closing retains manual pan and relative zoom around the target',()=>{
 const position=[5,3,8],target=[2,1,-4],closed={scale:1,lift:0},open={scale:1.4,lift:.6}
 const a=reframeOpeningCamera(position,target,closed,open)
 assert.deepEqual(a.target,[2,1.6,-4]);assert.ok(Math.abs((a.position[0]-a.target[0])/(position[0]-target[0])-1.4)<1e-12)
 const b=reframeOpeningCamera(a.position,a.target,open,closed)
 for(let i=0;i<3;i++){assert.ok(Math.abs(b.position[i]-position[i])<1e-12);assert.ok(Math.abs(b.target[i]-target[i])<1e-12)}
})
