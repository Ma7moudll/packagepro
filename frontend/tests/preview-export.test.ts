import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {previewFacePlan,assertPreviewLayers} from "../lib/editor/services/preview-export-contract.ts"
import {stampPreviewDensity} from "../lib/editor/services/preview-image-density.ts"
import {parseImageDpi} from "../lib/editor/services/dpi.ts"
import type {Face,Layer} from "../lib/editor/state/types.ts"
const dims={length:115,width:70,height:38}
const faces=["front","back","left","right","top","bottom"].map(id=>({id,name:id})) as Face[]
const copyBytes=(b:Uint8Array)=>b.slice().buffer as ArrayBuffer
const layer=():Layer=>({id:"text",name:"Test",type:"text",visible:true,locked:false,blendMode:"normal",faceId:"front",opacity:1,position:{x:10,y:10},scale:{x:1,y:1},rotation:0,textProperties:{content:"hello",fontFamily:"sans-serif",fontSize:12,fontWeight:400,color:"#000",align:"center",lineHeight:1.2,letterSpacing:0}})

test("face plans preserve actual top/bottom and inside dimensions without per-page offsets",()=>{
  const plan=previewFacePlan(dims,[...faces,{id:"inside_top",name:"Inside top"}],300)
  assert.deepEqual(plan.map(p=>[p.widthMm,p.heightMm]),[[115,38],[115,38],[70,38],[70,38],[115,70],[115,70],[115,70]])
  for(const p of plan){assert.ok(p.pageWidthMm>=p.widthMm+20);assert.equal(p.pageHeightMm,p.heightMm+40)}
})
test("requested sampling changes actual pixel requirements and never rounds below requested PPI",()=>{
  for(const density of [72,150,300,600])for(const p of previewFacePlan(dims,faces,density)){
    assert.ok(p.pixels.width*25.4/p.widthMm>=density)
    assert.ok(p.pixels.height*25.4/p.heightMm>=density)
  }
  assert.notDeepEqual(previewFacePlan(dims,faces,72)[0].pixels,previewFacePlan(dims,faces,600)[0].pixels)
})
test("invalid faces, dimensions, sampling and memory-heavy requests fail before canvas allocation",()=>{
  for(const invalid of [0,-1,NaN,Infinity])assert.throws(()=>previewFacePlan({...dims,height:invalid},faces,300))
  assert.throws(()=>previewFacePlan(dims,faces,96))
  assert.throws(()=>previewFacePlan(dims,[],300))
  assert.throws(()=>previewFacePlan(dims,[faces[0],faces[0]],300))
  assert.throws(()=>previewFacePlan(dims,[{id:"unknown",name:"Unknown"} as unknown as Face],300))
  assert.throws(()=>previewFacePlan({length:1000,width:1000,height:1000},faces,600),/too large/)
})
test("supported subset cannot silently discard visible groups, effects or unknown shapes",()=>{
  assert.doesNotThrow(()=>assertPreviewLayers([layer()]))
  const changes=[(l:Layer)=>l.type="group",(l:Layer)=>l.raisedPrint={text:"hello",method:"unspecified"},(l:Layer)=>l.blendMode="multiply",(l:Layer)=>l.textProperties!.letterSpacing=1,(l:Layer)=>l.textProperties!.content="two\nlines",(l:Layer)=>l.scale.x=Infinity]
  for(const change of changes){const l=layer();change(l);assert.throws(()=>assertPreviewLayers([l]))}
  const l=layer();l.type="shape";l.shapeProperties={shape:"triangle",fill:"#000",stroke:"",strokeWidth:0};assert.throws(()=>assertPreviewLayers([l]),/rectangles/)
})
for(const [extension,mime]of[["png","image/png"],["jpg","image/jpeg"]] as const){
  test(`${mime} density stamping preserves signature, source bytes and declared density`,()=>{
    const original=new Uint8Array(readFileSync(new URL(`./fixtures/preview-density.${extension}`,import.meta.url)))
    const before=original.slice()
    for(const density of [72,150,300,600]){
      const encoded=stampPreviewDensity(original,mime,density)
      assert.equal(parseImageDpi(copyBytes(encoded),mime),density)
      assert.deepEqual(original,before)
      assert.deepEqual(encoded.subarray(0,2),original.subarray(0,2))
      const twice=stampPreviewDensity(encoded,mime,density)
      assert.deepEqual(twice,encoded)
    }
  })
}
test("wrong format bytes and invalid density cannot receive a misleading MIME/density claim",()=>{
  const png=new Uint8Array(readFileSync(new URL("./fixtures/preview-density.png",import.meta.url)))
  const jpg=new Uint8Array(readFileSync(new URL("./fixtures/preview-density.jpg",import.meta.url)))
  assert.throws(()=>stampPreviewDensity(png,"image/jpeg",300),/JPEG/)
  assert.throws(()=>stampPreviewDensity(jpg,"image/png",300),/PNG/)
  assert.throws(()=>stampPreviewDensity(png,"image/png",96),/density/)
  assert.throws(()=>stampPreviewDensity(png.subarray(0,40),"image/png",300),/PNG/)
})
