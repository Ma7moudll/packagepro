import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {thankYouPreviewStructure,thankYouPreviewStockColour} from '../../backend/src/modules/catalog/thank-you-preview.ts'
import {getCatalogueProduct} from '../../shared/catalog/products.ts'
import {requestProductMaterial} from '../lib/editor/product-configuration.ts'
import {unsupportedSheetArtwork} from '../lib/editor/print-coverage.ts'
import {facePanel} from '../lib/editor/geometry/units.ts'

test('thank-you preview has exactly two correctly sized faces, no manufacturing blueprint',()=>{
 const p=getCatalogueProduct('thank_you_card')!;assert.deepEqual(p.readiness,{preview:'in_progress',dieline:'deferred',pricing:'quote_required'})
 for(const dims of [p.defaultDimensions,{length:120,width:1,height:180}]){
  const s=thankYouPreviewStructure(dims)
  assert.deepEqual(Object.keys(s.faces),['front','back']);assert.equal(s.type,'flat')
  for(const f of Object.values(s.faces)){assert.equal(f.width,dims.length);assert.equal(f.height,dims.height)}
  assert.deepEqual(facePanel(dims,'back'),{w:dims.length,h:dims.height});assert.equal('dieline' in s,false)
 }
 assert.throws(()=>thankYouPreviewStructure({length:NaN,width:1,height:150}))
 const seed=readFileSync('../backend/prisma/seed.ts','utf8')
 assert.match(seed,/entry\.id === 'thank_you_card' \? \{structure: thankYouPreviewStructure\(entry\.defaultDimensions\)\}/)
})
test('thank-you stock colors are scoped and shared by API and 3D',()=>{
 assert.equal(thankYouPreviewStockColour('thank-you-card','card-stock-white'),'#e9ecef')
 assert.equal(thankYouPreviewStockColour('thank_you_card','card-stock-kraft'),'#a8855a')
 for(const t of ['business_card','menu_card','loyalty_card','mailer_box'])assert.equal(thankYouPreviewStockColour(t,'card-stock-white'),undefined)
 assert.equal(thankYouPreviewStockColour('thank_you_card','unknown'),undefined)
 const contract=readFileSync('../backend/src/modules/catalog/thank-you-preview.ts','utf8');assert.doesNotMatch(contract,/^import /m)
 const docker=readFileSync('Dockerfile','utf8');assert.match(docker,/COPY backend\/src\/modules\/catalog\/thank-you-preview\.ts \/app\/backend\/src\/modules\/catalog\/thank-you-preview\.ts/)
 const api=readFileSync('../backend/src/modules/catalog/catalog.service.ts','utf8')
 assert.match(api,/thankYouPreviewStockColour\(product\.boxType \?\? '', materialCode\)/)
 const model=readFileSync('components/design-editor/models/BoxModels.tsx','utf8')
 assert.match(model,/exterior\?\.colour \?\? cardStockColour/);assert.match(model,/interior\?\.colour \?\? cardStockColour/)
})
test('stock switch follows stock canvas, preserves custom background and artwork, unknown requests ignored',()=>{
 const core:any={canvas:{backgroundColor:'#e9ecef'},model:{type:'thank_you_card',material:'card-stock-white'},layers:[{id:'a',faceId:'front'},{id:'b',faceId:'back'}],productConfig:{selectedMaterial:'card-stock-white'}}
 const codes=['card-stock-white','card-stock-kraft'];const next=requestProductMaterial(core,codes[1],codes)
 assert.equal(next.canvas.backgroundColor,'#a8855a');assert.equal(next.model.material,codes[1]);assert.equal(next.productConfig?.selectedMaterial,codes[1]);assert.equal(next.layers,core.layers)
 assert.equal(requestProductMaterial(next,codes[0],codes).canvas.backgroundColor,'#e9ecef')
 const custom={...core,canvas:{backgroundColor:'#123456'}};assert.equal(requestProductMaterial(custom,codes[1],codes).canvas,custom.canvas)
 assert.equal(requestProductMaterial(core,'unknown',codes),core)
 const legacy={...core,model:{...core.model,type:'business_card'}};assert.equal(requestProductMaterial(legacy,codes[1],codes).canvas,legacy.canvas)
})
test('thank-you sheet inside artwork stays flagged rather than silently remapped',()=>{
 const faces=Object.keys(thankYouPreviewStructure({length:100,width:1,height:150}).faces).map(id=>({id}))
 const layers=[{id:'preserve',faceId:'inside_front'}];assert.deepEqual(unsupportedSheetArtwork(faces,layers),{faces:['inside_front'],layerCount:1});assert.equal(layers[0].faceId,'inside_front')
})
