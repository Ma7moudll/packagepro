import {test} from 'node:test'
import assert from 'node:assert/strict'
import {withPrintCoverageFaces,faceIsPrinted} from '../lib/editor/print-coverage.ts'
import {editorRequiresQuote} from '../lib/editor/quote-policy.ts'
test('Both adds missing inside faces without replacing existing faces or metadata',()=>{
 const front={id:'front',name:'Front',width:115},inside={id:'inside_front',name:'Existing inside',width:115}
 const model={faces:[front,{id:'left',name:'Left'},inside],printCoverage:'both'}
 const next=withPrintCoverageFaces(model);assert.deepEqual(next.faces.map(f=>f.id),['front','left','inside_front','inside_left']);assert.equal(next.faces[2],inside);assert.equal(next.faces[0],front);assert.equal(withPrintCoverageFaces(next),next)
 assert.equal(withPrintCoverageFaces({...model,printCoverage:'outside'}).faces,model.faces)
})
test('inside and Both coverage cannot silently reuse an outside-only estimate',()=>{
 for(const printCoverage of ['inside','both'])assert.equal(editorRequiresQuote({model:{type:'mailer_box',printCoverage},layers:[]}),true)
 assert.equal(editorRequiresQuote({model:{type:'mailer_box',printCoverage:'outside'},layers:[]}),false)
})

test('retained artwork only prints on the requested side',()=>{
 assert.equal(faceIsPrinted('outside','inside_front'),false);assert.equal(faceIsPrinted('outside','front'),true)
 assert.equal(faceIsPrinted('inside','inside_front'),true);assert.equal(faceIsPrinted('inside','front'),false)
 assert.equal(faceIsPrinted('both','front'),true);assert.equal(faceIsPrinted('both','inside_front'),true)
 assert.equal(faceIsPrinted(undefined,'inside_front'),false)
})
