import {test} from 'node:test'
import assert from 'node:assert/strict'
import {preparePresetQuote,normalizePresetQuote,PresetQuoteRequired,presetColourVariant} from '../lib/editor/preset-catalog-quote.ts'
const core:any={model:{type:'mailer_box',dimensions:{length:115,width:70,height:38},material:'kraft',quantity:30,printCoverage:'outside',colorVariant:'none',finishing:'none',lamination:'none',adhesiveStrip:'none',fluteType:'E'},layers:[],product:{id:'mailer',slug:'custom-mailer-box'},productConfig:{variantId:'v',sku:'sku',selectedSize:'f42',selectedMaterial:'kraft'}}
const detail:any={id:'mailer',slug:'custom-mailer-box',moq:30,variants:[{id:'v',sku:'sku',sizeCode:'f42',materialCode:'kraft',printMode:'none',printSides:'outside_only',finish:'none',dimensions:{length:11.5,width:7,height:3.8,unit:'cm'}}],options:['material','printColors','printSides','finish'].map(key=>({key,values:[{value:({material:'kraft',printColors:'none',printSides:'outside_only',finish:'none'} as any)[key]}]}))}
const data:any={product:{id:'mailer'},variant:{id:'v',sku:'sku',dimensions:detail.variants[0].dimensions},quantity:30,config:[],material:{code:'kraft',currency:'EGP'},breakdown:{subtotal:334.99,tax:0,shippingEstimate:75,total:409.99},totalPrice:409.99332}
test('strict preset adapter normalizes dimensions and explicitly retains all pinned options',()=>{
 const p=preparePresetQuote(core,detail,30)
 assert.deepEqual(p.body.config,{material:'kraft',printColors:'none',printSides:'outside_only',finish:'none',size:'f42'})
 assert.deepEqual(p.body.dimensions,{length:115,width:70,height:38,unit:'mm'})
 assert.equal(p.variantId,'v');assert.equal(p.sku,'sku')
 const price=normalizePresetQuote(p,data)
 assert.equal(price.total,409.99);assert.equal(price.merchandiseTotal,334.99);assert.equal(price.merchandiseUnit,11.17);assert.equal(price.unit,409.99/30)
})
test('custom dimensions/material, stale identity and unmapped options never become preset prices',()=>{
 const mutations=[
  (s:any)=>s.model.dimensions.length++, (s:any)=>s.model.material='white',
  (s:any)=>s.productConfig.selectedMaterial='white',(s:any)=>s.productConfig.selectedFinish='matte',
  (s:any)=>s.productConfig.selectedSize='other',(s:any)=>s.productConfig.sku='other',
  (s:any)=>s.productConfig.variantId='other',(s:any)=>s.productConfig.customDimensions={length:120,width:70,height:38},
  (s:any)=>s.productConfig.printColors='mono',(s:any)=>s.productConfig.mysteryOption='requested',
  (s:any)=>s.model.finishing='matte',(s:any)=>s.model.lamination='soft-touch',(s:any)=>s.model.adhesiveStrip='double',
  (s:any)=>s.model.colorVariant='one_colour',(s:any)=>s.model.colorVariant='multicolour_premium',
  (s:any)=>s.model.printCoverage='inside',(s:any)=>s.model.boardSpecification={},(s:any)=>s.model.fluteType='B',
  (s:any)=>s.product.id='other',(s:any)=>delete s.productConfig,
 ]
 for(const mutate of mutations){const changed=structuredClone(core);mutate(changed);assert.throws(()=>preparePresetQuote(changed,detail,30),PresetQuoteRequired)}
 const changed=structuredClone(detail);changed.options.push({key:'unmapped',values:[{value:'default'}]});assert.throws(()=>preparePresetQuote(core,changed,30),PresetQuoteRequired)
 assert.throws(()=>preparePresetQuote(core,detail,29));assert.throws(()=>preparePresetQuote(core,detail,30.5))
})
test('mismatched catalog quote responses are not shown as the current selection',()=>{
 const prepared=preparePresetQuote(core,detail,30)
 for(const mutate of [(d:any)=>d.variant.dimensions.length++,(d:any)=>d.material.code='white',(d:any)=>d.quantity++,(d:any)=>d.variant.sku='other',(d:any)=>d.config=[{key:'material',value:'white'}],(d:any)=>d.breakdown.total+=0.01]){
  const changed=structuredClone(data);mutate(changed);assert.throws(()=>normalizePresetQuote(prepared,changed),PresetQuoteRequired)
 }
})
test('new preset print mapping is explicit, does not mutate saved requests or guess unknown modes',()=>{
 assert.equal(presetColourVariant('none'),'none');assert.equal(presetColourVariant('mono'),'one_colour');assert.equal(presetColourVariant('full_color'),'full_colour');assert.equal(presetColourVariant('unknown'),undefined)
 const saved=structuredClone(core);saved.model.colorVariant='one_colour';assert.throws(()=>preparePresetQuote(saved,detail,30),PresetQuoteRequired);assert.equal(saved.model.colorVariant,'one_colour')
 const printed=structuredClone(detail);printed.variants[0].printMode='mono';printed.options.find((o:any)=>o.key==='printColors').values=[{value:'mono'}]
 assert.equal(preparePresetQuote(saved,printed,30).body.config.printColors,'mono')
})

test('nonzero tax remains quote-required, not silently zeroed or claimed to match cart',()=>{
 const taxed=structuredClone(data);taxed.breakdown.tax=10;taxed.breakdown.total+=10;taxed.totalPrice+=10;
 assert.throws(()=>normalizePresetQuote(preparePresetQuote(core,detail,30),taxed),PresetQuoteRequired)
 assert.equal(taxed.breakdown.tax,10);assert.equal(taxed.breakdown.total,419.99)
})
