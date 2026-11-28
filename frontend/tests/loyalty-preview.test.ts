import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loyaltyPreviewStockColour,loyaltyPreviewStructure} from '../../backend/src/modules/catalog/loyalty-preview.ts'
import {getCatalogueProduct} from '../../shared/catalog/products.ts'
import {unsupportedSheetArtwork} from '../lib/editor/print-coverage.ts'
import {facePanel} from '../lib/editor/geometry/units.ts'
test('loyalty-only preview has two full sheet faces, preserves readiness and no production blueprint',()=>{
 const p=getCatalogueProduct('loyalty_card')!;assert.deepEqual(p.readiness,{preview:'in_progress',dieline:'deferred',pricing:'quote_required'})
 for(const dims of [p.defaultDimensions,{length:100,width:1,height:65}]){const s=loyaltyPreviewStructure(dims);assert.deepEqual(Object.keys(s.faces),['front','back']);for(const f of Object.values(s.faces)){assert.equal(f.width,dims.length);assert.equal(f.height,dims.height)}assert.deepEqual(facePanel(dims,'back'),{w:dims.length,h:dims.height});assert.equal('dieline' in s,false)}
 assert.throws(()=>loyaltyPreviewStructure({length:NaN,width:1,height:55}))
 assert.equal(loyaltyPreviewStockColour('loyalty-card','card-stock-white'),'#e9ecef');assert.equal(loyaltyPreviewStockColour('menu-card','card-stock-white'),undefined);assert.equal(loyaltyPreviewStockColour('loyalty-card','card-stock-kraft'),undefined)
 const faces=Object.keys(loyaltyPreviewStructure(p.defaultDimensions).faces).map(id=>({id}));assert.equal(unsupportedSheetArtwork(faces as any,[{id:'b',faceId:'back',visible:true,type:'text'}] as any),null)
})
