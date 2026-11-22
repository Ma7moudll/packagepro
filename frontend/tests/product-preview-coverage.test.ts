import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {productPreviewCoverage} from '../lib/editor/product-preview-coverage.ts'

test('known box families use independent stock and text relief without changing production approval',()=>{
 for(const type of ['mailer_box','custom-mailer-box','shipping_box','custom-shipping-box','rigid_box','gift_box','folding_carton','pizza_box']){
  const c=productPreviewCoverage(type)
  assert.equal(c.geometry,'preview',type);assert.equal(c.twoSidedStock,true,type);assert.equal(c.selectiveTextRelief,true,type);assert.equal(c.productionApproved,false)
 }
})
test('unknown and distinct unprepared subtypes never masquerade as mailer boxes',()=>{
 for(const type of ['pillow_box','rigid_magnetic_box','cotton_bag','smoothie_cup','not-real']){
  const c=productPreviewCoverage(type)
  assert.equal(c.geometry,'unavailable',type);assert.equal(c.family,undefined,type);assert.equal(c.twoSidedStock,false,type)
 }
 const source=readFileSync('components/design-editor/models/BoxModels.tsx','utf8')
 assert.match(source,/default:return UnsupportedProductPreview/)
 assert.doesNotMatch(source,/default:\s*return MailerBox/)
})
test('every product picker entry has an explicit supported or unavailable route',()=>{
 const catalogue=readFileSync('lib/editor/data/products-data.ts','utf8')
 const ids=[...catalogue.matchAll(/id: "([\w-]+)",\n\s+name: \{ en:/g)].map(m=>m[1])
 assert.equal(ids.length,55)
 for(const id of ids){const c=productPreviewCoverage(id);assert.ok(c.geometry==='preview'||c.geometry==='unavailable');if(!c.family)assert.equal(c.selectiveTextRelief,false)}
})
test('cut edges retain no printable face and inside faces are distinct',()=>{
 const source=readFileSync('components/design-editor/models/StockPanel.tsx','utf8')
 assert.match(source,/material=\{\[outside,inside,edge\]\}/)
 assert.match(source,/insideFaceId:insideFaceId\?\?`inside_\$\{faceId\}`/)
 assert.match(source,/geometry\.dispose/)
})
test('shipping top artwork is cropped across two flaps, not repeated as a complete logo',()=>{
 const s=readFileSync('components/design-editor/models/BoxModels.tsx','utf8')
 const section=s.slice(s.indexOf('export function ShippingBox'),s.indexOf('export function RigidBox'))
 assert.match(section,/uvRect=\{\[0,0,1,\.5\]\}/)
 assert.match(section,/uvRect=\{\[0,\.5,1,1\]\}/)
})
test('nonpaper material policy does not pretend film/foil are cardboard liners',()=>{
 for(const type of ['poly_mailer_bag','bio_poly_mailer_bag','stand_up_pouch','doypack_valve']){
  const c=productPreviewCoverage(type);assert.equal(c.twoSidedStock,false);assert.equal(c.selectiveTextRelief,true);assert.equal(c.family===undefined,false)
 }
 for(const type of ['paper_bag','paper_mailer_bag','cup','tube','envelope','business_card']){assert.equal(productPreviewCoverage(type).twoSidedStock,false);assert.equal(productPreviewCoverage(type).paperSurface,true)}
})

test('session restore owns initialization even without catalogue product identity',()=>{
 const page=readFileSync('app/editor/page.tsx','utf8')
 const editor=readFileSync('components/design-editor/PackhelpEditor.tsx','utf8')
 assert.ok(page.includes('preserveRestoredDesign={!!sessionIdParam}'))
 assert.ok(editor.indexOf('if (preserveRestoredDesign)')<editor.indexOf('applyCoreState((core)'))
})

test('mailer seal edges follow selected stock instead of a white default',()=>{
 const source=readFileSync('components/design-editor/models/SoftProducts.tsx','utf8');assert.match(source,/const seal=stock.outside/);assert.doesNotMatch(source,/#dedede/)
})
