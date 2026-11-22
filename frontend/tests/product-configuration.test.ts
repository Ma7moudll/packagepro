import {test} from 'node:test'
import assert from 'node:assert/strict'
import {CATALOGUE_PRODUCTS,CATALOGUE_CANDIDATE_MATERIALS} from '../../shared/catalog/products.ts'
import {productConfiguration,productDimensionChange} from '../lib/editor/product-configuration.ts'
import {editorRequiresQuote} from '../lib/editor/quote-policy.ts'
test('all 55 products have exact product-listed candidate material codes, not supplier approval',()=>{
 for(const p of CATALOGUE_PRODUCTS){const codes=CATALOGUE_CANDIDATE_MATERIALS[p.id];assert.ok(codes.length,p.id);assert.deepEqual(productConfiguration(p.id,codes).materials,codes);assert.equal(productConfiguration(p.id,codes).supplierConfirmed,false)}
 assert.deepEqual(CATALOGUE_CANDIDATE_MATERIALS.cup,['paper-coated-white'])
 assert.deepEqual(CATALOGUE_CANDIDATE_MATERIALS.poly_mailer_bag,['poly-white','poly-black'])
})
test('cups, textiles, pouches and film cannot configure box liners',()=>{
 for(const id of ['cup','paper_bag','poly_mailer_bag','cotton_bag','stand_up_pouch','circle_label'])assert.equal(productConfiguration(id).boardStock,false)
 assert.equal(productConfiguration('shipping_box').boardStock,true)
})
test('only products with a modelled moving closure expose open-close controls',()=>{
 for(const id of ['cup','paper_bag','stand_up_pouch','business_card','circle_label','pillow_box'])assert.equal(productConfiguration(id).opening,false)
 for(const id of ['shipping_box','tube','envelope','poly_mailer_bag'])assert.equal(productConfiguration(id).opening,true)
})
test('cup, tube and round-label dimensions use their own axes',()=>{
 assert.deepEqual(productConfiguration('cup').dimensions.map(d=>d.en),['Base diameter','Rim diameter','Height'])
 assert.deepEqual(productDimensionChange('tube',{length:80,width:80,height:200},'width',100),{length:100,width:100,height:200})
 assert.equal(productDimensionChange('circle_label',{length:80,width:1,height:80},'length',100).height,100)
})
test('all 47 new products are quote-only in every editor pricing surface',()=>{
 let q=0;for(const p of CATALOGUE_PRODUCTS){const required=editorRequiresQuote({model:{type:p.id},layers:[]});assert.equal(required,p.readiness.pricing==='quote_required',p.id);if(required)q++}assert.equal(q,47)
 assert.equal(editorRequiresQuote({model:{type:'paper_bag',materialSpecification:{code:'paper-white'}},layers:[]}),true)
 assert.equal(editorRequiresQuote({model:{type:'not-real'},layers:[]}),true)
})
