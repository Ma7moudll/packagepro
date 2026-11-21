import {test} from 'node:test'
import assert from 'node:assert/strict'
import {LINERS,initialBoardSpecification,requiresBoardQuote} from '../lib/editor/material-specification.ts'
import {serializeDesignData,deserializeDesignData,normalizeFromManifest} from '../lib/editor/services/dieline-manifest.ts'
import type {DesignCoreState} from '../lib/editor/state/types.ts'

test('independent brown/white combinations and both imported finishes remain distinct',()=>{
 const ids=LINERS.map(l=>l.id)
 assert.deepEqual(ids,['brown-dark','brown-light','white-imported-matte','white-imported-gloss','kraft-water-resistant'])
 for(const outside of ids)for(const inside of ids){
  const spec={...initialBoardSpecification('kraft'),outside,inside}
  assert.equal(requiresBoardQuote(spec),true)
  assert.deepEqual(JSON.parse(JSON.stringify(spec)),spec)
 }
 assert.equal(requiresBoardQuote(undefined),false)
 assert.equal(requiresBoardQuote(null),false)
 assert.ok(LINERS.find(l=>l.id==='white-imported-matte')!.roughness>LINERS.find(l=>l.id==='white-imported-gloss')!.roughness)
})

test('stock, coatings, print references and selective word survive saved-design reopen',()=>{
 const spec=initialBoardSpecification('kraft')
 spec.inside='white-imported-matte';spec.outside='brown-dark';spec.coatings={cellophane:true,uv:true};spec.print={colourCount:'custom',customColours:'PANTONE 185 C'}
 const state={model:{type:'mailer-box',dimensions:{length:200,width:150,height:100},boardSpecification:spec},ui:{selectedFace:"inside_top"},canvas:{width:600,height:450},layers:[{id:'text',type:'text',faceId:'inside_top',raisedPrint:{text:'بارز',method:'unspecified'},textProperties:{content:'نص بارز'}}],zones:{}} as unknown as DesignCoreState
 const envelope=serializeDesignData(state)
 const reopened=deserializeDesignData(JSON.parse(JSON.stringify(envelope)))
 const normalized=normalizeFromManifest(reopened.state,reopened.manifest)
 assert.deepEqual(normalized.model.boardSpecification,spec)
 assert.deepEqual(normalized.layers,state.layers)
 assert.equal('raised' in spec.print,false)
})

test('inside caps select inside artwork while cut edges are not printable',async()=>{
 const {intersectionFaceId}=await import('../lib/editor/geometry/intersection-face.ts')
 const object={userData:{faceId:'top',insideFaceId:'inside_top'}}
 assert.equal(intersectionFaceId({object,face:{materialIndex:0}}),'top')
 assert.equal(intersectionFaceId({object,face:{materialIndex:1}}),'inside_top')
 assert.equal(intersectionFaceId({object,face:{materialIndex:2}}),undefined)
 assert.equal(intersectionFaceId({object:{userData:{faceId:'front'}},face:{materialIndex:1}}),'front')
})

test('relief faces do not attach the competing paper normal map',async()=>{
 const {readFileSync}=await import('node:fs')
 const source=readFileSync('components/design-editor/models/BoxModels.tsx','utf8')
 const reliefBlock=source.slice(source.indexOf('    if (relief) {'),source.indexOf('    faceTextureCache.set'))
 assert.match(reliefBlock,/mat\.normalMap = null/)
 assert.match(reliefBlock,/mat\.bumpMap = reliefTexture/)
})
