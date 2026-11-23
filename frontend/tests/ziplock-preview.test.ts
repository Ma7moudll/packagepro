import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {productPreviewCoverage} from '../lib/editor/product-preview-coverage.ts'
import {productConfiguration,productDimensionChange} from '../lib/editor/product-configuration.ts'
import {unsupportedSheetArtwork,assertNoUnsupportedSheetArtwork,unsupportedArtworkOutputMessage} from '../lib/editor/print-coverage.ts'
import {createZiplockFilmSurface,createZiplockZipStrip,ZIP_BAND,ZIP_RIDGES,ziplockFilmPoint} from '../lib/editor/geometry/ziplock-film.ts'
import {getCatalogueProduct} from '../../shared/catalog/products.ts'
import {ziplockPreviewStructure,ziplockPreviewStockColour,unsupportedZiplockArtwork} from '../../backend/src/modules/catalog/ziplock-preview.ts'
// Note: the backend derive wrapper (services/pre-press-checker) uses
// extensionless imports the frontend node runner cannot resolve, so the
// derive-level cases live in the backend vitest suite alongside the card
// and pouch cases (unsupported-artwork.unit.test.ts).

test('frosted ziplock routes to its own preview family, never to pouch or mailer-bag geometry',()=>{
 for(const type of ['frosted_ziplock_bag','frosted-ziplock-bag']){
  const c=productPreviewCoverage(type)
  assert.equal(c.family,'ziplock-bag',type);assert.equal(c.geometry,'preview',type)
  assert.equal(c.paperSurface,false,type);assert.equal(c.twoSidedStock,false,type);assert.equal(c.productionApproved,false,type)
 }
 // Controls: neighbouring products keep their existing families.
 assert.equal(productPreviewCoverage('poly_mailer_bag').family,'mailer-bag')
 assert.equal(productPreviewCoverage('bio_poly_mailer_bag').family,'mailer-bag')
 assert.equal(productPreviewCoverage('stand_up_pouch').family,'pouch')
 assert.equal(productPreviewCoverage('business_card').family,'flat')
 assert.equal(productPreviewCoverage('mailer_box').family,'mailer')
 const models=readFileSync('components/design-editor/models/BoxModels.tsx','utf8')
 assert.match(models,/case "ziplock-bag":return ZiplockBag/)
 assert.match(models,/case "mailer-bag":return MailerBag/)
 assert.match(models,/case "pouch":return StandUpPouch/)
})

test('catalogue moves only the preview axis: in_progress preview, deferred dieline, quote_required pricing',()=>{
 const entry=getCatalogueProduct('frosted_ziplock_bag')!
 assert.equal(entry.previewFamily,'ziplock-bag');assert.equal(entry.plannedFamily,'ziplock-bag')
 assert.deepEqual(entry.readiness,{preview:'in_progress',dieline:'deferred',pricing:'quote_required'})
 assert.deepEqual(entry.defaultDimensions,{length:200,width:5,height:300})
 assert.equal(entry.slug,'custom-frosted-ziplock-bag');assert.equal(entry.productId,'prod-frosted-ziplock-bag')
 // Controls: siblings are untouched.
 const mailer=getCatalogueProduct('poly_mailer_bag')!
 assert.equal(mailer.previewFamily,'mailer-bag');assert.equal(mailer.readiness.preview,'in_progress');assert.equal(mailer.readiness.pricing,'estimated')
 const pouch=getCatalogueProduct('stand_up_pouch')!
 assert.equal(pouch.previewFamily,'pouch');assert.equal(pouch.readiness.pricing,'quote_required')
})

test('width and height are editable; the film axis is not offered and no catalogue limits are invented',()=>{
 const config=productConfiguration('frosted_ziplock_bag',['plastic-frosted'])
 assert.deepEqual(config.dimensions.map(d=>d.key),['length','height'])
 const start={length:200,width:5,height:300}
 assert.deepEqual(productDimensionChange('frosted_ziplock_bag',start,'length',260),{length:260,width:5,height:300})
 assert.deepEqual(productDimensionChange('frosted_ziplock_bag',start,'height',180),{length:200,width:5,height:180})
 // No min/max limits exist in the catalogue data, so none are applied:
 // a large value passes through unchanged (only the shared >=1 floor applies).
 assert.equal(productDimensionChange('frosted_ziplock_bag',start,'height',5000).height,5000)
 assert.equal(productDimensionChange('frosted_ziplock_bag',start,'length',1).length,1)
 // Control: the poly mailer keeps all three editable axes.
 assert.deepEqual(productConfiguration('poly_mailer_bag').dimensions.map(d=>d.key),['length','width','height'])
})

test('seed preview structure carries exactly the front and back film faces at catalogue size',()=>{
 const s=ziplockPreviewStructure({length:200,width:5,height:300})
 assert.equal(s.boxType,'frosted-ziplock-bag')
 assert.deepEqual(Object.keys(s.faces),['front','back'])
 assert.deepEqual(s.faces.front,{width:200,height:300,depth:5,label:'Front'})
 assert.deepEqual(s.faces.back,{width:200,height:300,depth:5,label:'Back'})
 assert.deepEqual(s.zones,{front:[],back:[]})
 assert.throws(()=>ziplockPreviewStructure({length:0,width:5,height:300}),/Invalid ziplock preview dimensions/)
 const seed=readFileSync('../backend/prisma/seed.ts','utf8')
 assert.match(seed,/entry\.id === 'frosted_ziplock_bag' \? \{structure: ziplockPreviewStructure\(entry\.defaultDimensions\)\}/)
 // Illustrative frosted stock colour follows the loyalty/thank-you hook pattern.
 assert.equal(ziplockPreviewStockColour('frosted-ziplock-bag','plastic-frosted'),'#e9ebeb')
 assert.equal(ziplockPreviewStockColour('frosted_ziplock_bag','poly-white'),undefined)
 assert.equal(ziplockPreviewStockColour('poly_mailer_bag','plastic-frosted'),undefined)
 const service=readFileSync('../backend/src/modules/catalog/catalog.service.ts','utf8')
 assert.match(service,/ziplockPreviewStockColour\(product\.boxType/)
})

test('ziplock film geometry is a flat sealed sheet with a raised zip strip near the top',()=>{
 const W=2,H=3,D=.05
 const front=createZiplockFilmSurface(W,H,D,false),back=createZiplockFilmSurface(W,H,D,true)
 const fp=front.getAttribute('position'),bp=back.getAttribute('position'),fuv=front.getAttribute('uv'),buv=back.getAttribute('uv')
 assert.equal(fp.count,29*37)
 // Sealed edges: the pillow vanishes at u=0 and v=0, peaks mid-sheet.
 assert.ok(Math.abs(ziplockFilmPoint(W,H,D,0,.5).z-.0008)<1e-9)
 assert.ok(Math.abs(ziplockFilmPoint(W,H,D,.5,0).z-.0008)<1e-9)
 assert.ok(Math.abs(ziplockFilmPoint(W,H,D,.5,.5).z-(.0008+D/2))<1e-6)
 assert.ok(ziplockFilmPoint(W,H,D,.5,.5,true).z<0)
 // Back UVs mirror U so back artwork reads correctly, never mirrored.
 assert.equal(fuv.getX(0),0);assert.equal(buv.getX(0),1)
 let maxFrontZ=0,minBackZ=0
 for(let i=0;i<fp.count;i++)maxFrontZ=Math.max(maxFrontZ,fp.getZ(i))
 for(let i=0;i<bp.count;i++)minBackZ=Math.min(minBackZ,bp.getZ(i))
 assert.ok(maxFrontZ>0&&minBackZ<0)
 // Zip ridges sit inside the declared band near the top, lifted off the film.
 assert.ok(ZIP_BAND.v0>0.8&&ZIP_BAND.v1<1)
 for(const v of ZIP_RIDGES){
  assert.ok(v>ZIP_BAND.v0&&v<ZIP_BAND.v1)
  const ridge=createZiplockZipStrip(W,H,D,v,.007,.0013,false),rp=ridge.getAttribute('position')
  for(let i=0;i<rp.count;i++){
   assert.ok(rp.getY(i)>ZIP_BAND.v0*H&&rp.getY(i)<ZIP_BAND.v1*H)
   // Every ridge vertex rides exactly the lift above the film surface
   // point beneath it (same u, same v row).
   const col=i%29,row=Math.floor(i/29),u=.015+.97*col/28,vv=v-.007+.014*row/2
   assert.ok(Math.abs(rp.getZ(i)-(ziplockFilmPoint(W,H,D,u,vv).z+.0013))<1e-6)
  }
  ridge.dispose()
 }
 front.dispose();back.dispose()
 // The ziplock geometry is its own: it borrows neither pouch nor mailer geometry.
 const source=readFileSync('lib/editor/geometry/ziplock-film.ts','utf8')
 assert.doesNotMatch(source,/pouch-preview|mailer-film|createPouchSurface|createMailerFilm/)
 const shape=readFileSync('components/design-editor/models/ZiplockProduct.tsx','utf8')
 assert.match(shape,/frosted-ziplock-construction/)
 assert.match(shape,/transparent=true/)
 assert.doesNotMatch(shape,/PouchShape|createPouchSurface/)
 // Controls: the existing bag and pouch shapes are untouched by the new family.
 const soft=readFileSync('components/design-editor/models/SoftProducts.tsx','utf8')
 assert.match(soft,/mailer-bag-construction/);assert.match(soft,/createMailerFlap/)
 const pouch=readFileSync('components/design-editor/models/PouchProduct.tsx','utf8')
 assert.match(pouch,/stand-up-pouch-construction/)
})

test('ziplock output guard flags only unrepresented surfaces, with product-truthful wording',()=>{
 const faces=[{id:'front'},{id:'back'}]
 const clean=[{faceId:'front'},{faceId:'back'}]
 assert.equal(unsupportedZiplockArtwork('frosted_ziplock_bag',clean),null)
 assert.equal(unsupportedSheetArtwork(faces,clean,'frosted_ziplock_bag'),null)
 const flagged=[...clean,{faceId:'inside_front'},{faceId:'top',visible:false}]
 const result=unsupportedSheetArtwork(faces,flagged,'frosted_ziplock_bag')!
 assert.deepEqual(result,{faces:['inside_front','top'],layerCount:2,product:'frosted_ziplock_bag'})
 const message=unsupportedArtworkOutputMessage(result)
 assert.match(message,/This frosted ziplock bag design has 2 artwork layer\(s\)/)
 assert.match(message,/Only front and back artwork are mapped/)
 assert.match(message,/reference preview only/)
 assert.match(message,/No production surface specification is implied/)
 assert.throws(()=>assertNoUnsupportedSheetArtwork(faces,flagged,'frosted_ziplock_bag'),/Export blocked: This frosted ziplock bag/)
 // Legacy absent faceIds belong to front, never to an explicit surface.
 assert.equal(unsupportedZiplockArtwork('frosted_ziplock_bag',[{}, {faceId:undefined}]),null)
 // Controls: the same layers are not a ziplock problem for other products,
 // and the pouch and card boundaries keep their own wording.
 const boxFaces=['front','back','left','right','top','bottom'].map(id=>({id}))
 assert.equal(unsupportedSheetArtwork(boxFaces,flagged,'poly_mailer_bag'),null)
 assert.equal(unsupportedSheetArtwork(boxFaces,flagged,'mailer_box'),null)
 assert.equal(unsupportedSheetArtwork(faces,flagged,'stand_up_pouch')?.product,'stand_up_pouch')
 const card=unsupportedSheetArtwork(faces,[{faceId:'inside_front'}],'business_card')!
 assert.equal(card.product,undefined);assert.match(unsupportedArtworkOutputMessage(card),/This card design/)
 // The editor banner headline names the ziplock instead of inside faces.
 const shell=readFileSync('components/editor/layout/EditorShell.tsx','utf8')
 assert.match(shell,/Unsupported ziplock bag artwork is preserved\. Outputs are blocked\./)
})

test('backend derivation sources carry the ziplock branch (derive cases run in the backend suite)',()=>{
 const derive=readFileSync('../backend/src/services/pre-press-checker/unsupported-artwork.ts','utf8')
 assert.match(derive,/unsupportedZiplockArtwork\(d\.model\?\.type/)
 assert.match(derive,/prod-frosted-ziplock-bag/)
 assert.match(derive,/unsupported\.product==='frosted_ziplock_bag'\)return unsupportedZiplockOutputMessage/)
 const backendTests=readFileSync('../backend/src/services/pre-press-checker/unsupported-artwork.unit.test.ts','utf8')
 assert.match(backendTests,/frosted ziplock bag preview-surface boundary/)
 assert.match(backendTests,/Proof blocked: This frosted ziplock bag/)
})
