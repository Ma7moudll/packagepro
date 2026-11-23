import {test} from 'node:test'
import assert from 'node:assert/strict'
import {unsupportedSheetArtwork,assertNoUnsupportedSheetArtwork,unsupportedArtworkOutputMessage} from '../lib/editor/print-coverage.ts'
import {unsupportedStandUpPouchArtwork} from '../../backend/src/modules/catalog/pouch-preview-contract.ts'
const faces=['front','back','left','right','top','bottom'].map(id=>({id}))
test('stand-up pouch guard derives unsupported surfaces without changing saved faces or layers',()=>{
 const layers=[{faceId:'front'},{faceId:'back'},{faceId:'left',visible:false},{faceId:'inside_front'}],before=JSON.stringify({faces,layers})
 const result=unsupportedSheetArtwork(faces,layers,'stand_up_pouch')!
 assert.deepEqual(result,{faces:['inside_front','left'],layerCount:2,product:'stand_up_pouch'})
 assert.match(unsupportedArtworkOutputMessage(result),/Only front and back artwork are mapped/)
 assert.throws(()=>assertNoUnsupportedSheetArtwork(faces,layers,'stand_up_pouch'),/Export blocked: This stand-up pouch/)
 assert.equal(JSON.stringify({faces,layers}),before)
 // Legacy absent IDs become front in applyCoreState, never an explicit side.
 assert.equal(unsupportedStandUpPouchArtwork('stand_up_pouch',[{}, {faceId:undefined}, {faceId:''}]),null)
 assert.deepEqual(unsupportedStandUpPouchArtwork('stand_up_pouch',[{}, {faceId:'left'}]),{faces:['left'],layerCount:1,product:'stand_up_pouch'})
 assert.deepEqual(unsupportedStandUpPouchArtwork('stand_up_pouch',[{faceId:'missing'}]),{faces:['missing'],layerCount:1,product:'stand_up_pouch'})
 assert.equal(unsupportedStandUpPouchArtwork('stand-up-pouch',[{faceId:'front'},{faceId:'back'}]),null)
 for(const type of ['doypack_pouch','loyalty_card','mailer_box','unknown'])assert.equal(unsupportedSheetArtwork(faces,layers,type),null)
})
