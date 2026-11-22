import {test} from 'node:test'
import assert from 'node:assert/strict'
import {cartDesignFingerprint} from '../lib/editor/cart-design-fingerprint.ts'
const core:any={model:{type:'mailer_box',dimensions:{length:115,width:70,height:38},material:'kraft',quantity:30,printCoverage:'outside'},layers:[{id:'art',textProperties:{content:'BEFORE'}}],canvas:{width:300,height:200,backgroundColor:'#a67c52'},product:{id:'prod-mailer-box',slug:'custom-mailer-box'},productConfig:{sku:'test',variantId:'variant'},lifecycleStatus:'DRAFT'}
test('cart fingerprint ignores display/selection/provenance changes and key order',()=>{
 const changed=structuredClone(core);changed.canvas.width=999;changed.canvas.height=100;changed.ui={selectedFace:'top'};changed.selectedLayerIds=['art'];changed.manifestMetadata={schemaVersion:2};changed.model.dimensions={height:38,width:70,length:115}
 assert.equal(cartDesignFingerprint(core),cartDesignFingerprint(changed));assert.equal(cartDesignFingerprint(core),cartDesignFingerprint(structuredClone(core)))
})
test('cart fingerprint catches artwork and requested product changes',()=>{
 for(const mutate of [(s:any)=>s.layers[0].textProperties.content='AFTER',(s:any)=>s.model.dimensions.length=120,(s:any)=>s.model.material='white',(s:any)=>s.canvas.backgroundColor='#ffffff',(s:any)=>s.product.id='other',(s:any)=>s.productConfig.sku='other',(s:any)=>s.model.printCoverage='both',(s:any)=>s.lifecycleStatus='SUBMITTED']){const changed=structuredClone(core);mutate(changed);assert.notEqual(cartDesignFingerprint(core),cartDesignFingerprint(changed))}
})
