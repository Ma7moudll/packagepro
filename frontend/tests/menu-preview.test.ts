import {test} from 'node:test'
import assert from 'node:assert/strict'
import {menuPreviewStockColour,menuPreviewStructure} from '../../backend/src/modules/catalog/menu-preview.ts'
import {getCatalogueProduct} from '../../shared/catalog/products.ts'
import {unsupportedSheetArtwork} from '../lib/editor/print-coverage.ts'
import {facePanel} from '../lib/editor/geometry/units.ts'
test('menu-only preview has two full sheet faces, preserves readiness and no production blueprint',()=>{
 const p=getCatalogueProduct('menu_card')!;assert.deepEqual(p.readiness,{preview:'in_progress',dieline:'deferred',pricing:'quote_required'})
 for(const dims of [p.defaultDimensions,{length:100,width:1,height:65}]){const s=menuPreviewStructure(dims);assert.deepEqual(Object.keys(s.faces),['front','back']);for(const f of Object.values(s.faces)){assert.equal(f.width,dims.length);assert.equal(f.height,dims.height)}assert.deepEqual(facePanel(dims,'back'),{w:dims.length,h:dims.height});assert.equal('dieline' in s,false)}
 assert.throws(()=>menuPreviewStructure({length:NaN,width:1,height:55}))
 assert.equal(menuPreviewStockColour('menu-card','card-stock-white'),'#e9ecef');assert.equal(menuPreviewStockColour('loyalty-card','card-stock-white'),undefined);assert.equal(menuPreviewStockColour('menu-card','card-stock-kraft'),undefined)
 const faces=Object.keys(menuPreviewStructure(p.defaultDimensions).faces).map(id=>({id}));assert.equal(unsupportedSheetArtwork(faces as any,[{id:'b',faceId:'back',visible:true,type:'text'}] as any),null)
})

import {unsupportedMenuArtwork,unsupportedMenuOutputMessage} from '../../backend/src/modules/catalog/menu-preview.ts'
test('menu legacy side/inside/unknown artwork stays blocked independently of saved face shape',()=>{
 for(const faceId of ['left','right','top','bottom','inside_front','inside_back','unknown'])assert.deepEqual(unsupportedMenuArtwork('menu-card',[{faceId}]),{faces:[faceId],layerCount:1,product:'menu_card'})
 assert.equal(unsupportedMenuArtwork('menu-card',[{}, {faceId:''},{faceId:'front'},{faceId:'back'}]),null)
 assert.equal(unsupportedMenuArtwork('business_card',[{faceId:'left'}]),null)
 const u=unsupportedSheetArtwork(['front','back','left','right','top','bottom'].map(id=>({id})),[{faceId:'left'}],'menu_card');assert.equal(u?.product,'menu_card');assert.match(unsupportedMenuOutputMessage(u!),/This menu card/)
})
