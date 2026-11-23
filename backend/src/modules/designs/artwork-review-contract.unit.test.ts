import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import fixture from './fixtures/f42-artwork-review.json';
import { assertReviewInput, stableJson, reviewSnapshot, F42_GEOMETRY_SHA256 } from './artwork-review-contract';
const copy=(): any => structuredClone(fixture);

describe('F42 artwork review contract',()=>{
  it('pins the committed canonical mailer geometry, not an invented net',()=>{
    const data=copy();expect(()=>assertReviewInput(data)).not.toThrow();
    expect(createHash('sha256').update(stableJson(data.manifest.dieline)).digest('hex')).toBe(F42_GEOMETRY_SHA256);
  });
  it.each(['inside','both'])('rejects %s coverage',coverage=>{const d=copy();d.model.printCoverage=coverage;expect(()=>assertReviewInput(d)).toThrow('outside-only');});
  it('rejects other sizes, products, best-effort history and rotation',()=>{
    for(const change of [(d:any)=>d.model.dimensions.length=116,(d:any)=>d.product.support='deferred',(d:any)=>d.reproducibility='best_effort',(d:any)=>d.manifest.dieline.panels.top.rotation=90]) {
      const d=copy();change(d);expect(()=>assertReviewInput(d)).toThrow();
    }
  });
  it('rejects unsupported artwork, outside assets, effects and missing faces',()=>{
    for(const change of [(d:any)=>d.layers[0].type='group',(d:any)=>d.layers[0].textProperties.shadow={},(d:any)=>d.layers[0].raisedPrint={text:'x'},(d:any)=>d.layers[0].faceId='inside_front',(d:any)=>d.model.faces.pop(),(d:any)=>d.canvas.backgroundImage='x',(d:any)=>{d.layers[0]={...d.layers[0],type:'image',imageProperties:{src:'https://example.invalid/logo.png'}}}]) {
      const d=copy();change(d);expect(()=>assertReviewInput(d)).toThrow();
    }
  });
  it('binds every printable input, not selection or camera',()=>{
    const d=copy(),original=reviewSnapshot(d);d.ui.selectedFace='top';d.camera.zoom=2;expect(reviewSnapshot(d)).toBe(original);
    d.layers[0].textProperties.content='changed';expect(reviewSnapshot(d)).not.toBe(original);
    const b=copy();b.canvas.backgroundColor='#112233';expect(reviewSnapshot(b)).not.toBe(original);
  });
  it('accepts embedded images and faithfully representable rectangle/circle subset only',()=>{
    const d=copy();d.layers[0]={...d.layers[0],type:'image',imageProperties:{src:'data:image/png;base64,YQ=='}};expect(()=>assertReviewInput(d)).not.toThrow();
    d.layers[0]={...d.layers[0],type:'shape',shapeProperties:{shape:'triangle',fill:'#fff',stroke:'',strokeWidth:0}};expect(()=>assertReviewInput(d)).toThrow('rectangles');
  });
  it('does not let non-finite transforms or missing assets pass',()=>{const d=copy();d.layers[0].scale.x=Infinity;expect(()=>assertReviewInput(d)).toThrow('transform');});
});
