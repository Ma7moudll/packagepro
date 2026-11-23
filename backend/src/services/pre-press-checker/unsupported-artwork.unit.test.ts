// Output boundary for two-face sheet designs carrying inside-face artwork.
// The backend must derive the truth from the saved layers and structure —
// never from the optional manifest flag alone. A saved card whose flag was
// stripped (or never written) but whose inside artwork layers remain must
// still refuse a proof; boxes and clean cards are unaffected.

import { describe, it, expect } from 'vitest';
import { deriveUnsupportedArtwork } from './unsupported-artwork';
import { composeProofPdf, readManifest } from './proof-generator';

const sheetFaces = [
  { id: 'front', name: 'Front' },
  { id: 'back', name: 'Back' },
  { id: 'inside_front', name: 'Inside Front' },
  { id: 'inside_back', name: 'Inside Back' },
];
const insideLayer = { id: 'inside-art', faceId: 'inside_front' };
const frontLayer = { id: 'front-art', faceId: 'front' };

// A saved v2 envelope for the card with NO unsupportedArtwork flag in the
// manifest — the flag-absent case from the owner's runtime confirmation.
const flaglessCardData = {
  schemaVersion: 2,
  manifest: {
    product: { id: 'prod-business-card', slug: 'custom-business-card', boxType: 'business-card' },
    faces: { front: { w: 85, h: 55 }, back: { w: 85, h: 55 } },
    // note: no unsupportedArtwork flag
  },
  model: { faces: sheetFaces, printCoverage: 'both', dimensions: { length: 85, width: 1, height: 55 } },
  layers: [frontLayer, insideLayer],
};

describe('deriveUnsupportedArtwork (data-derived, flag-independent)', () => {
  it('derives the block from saved layers + structure when the flag is absent', () => {
    expect(deriveUnsupportedArtwork(flaglessCardData)).toEqual({ faces: ['inside_front'], layerCount: 1 });
  });

  it('returns undefined for a clean card (sheet faces, no inside layers)', () => {
    expect(
      deriveUnsupportedArtwork({ ...flaglessCardData, layers: [frontLayer] })
    ).toBeUndefined();
  });

  it('returns undefined for a box with inside-face layers (not a sheet)', () => {
    const boxFaces = ['front', 'back', 'left', 'right', 'top', 'bottom', 'inside_front', 'inside_back'].map(
      (id) => ({ id, name: id })
    );
    expect(
      deriveUnsupportedArtwork({
        manifest: { faces: {} },
        model: { faces: boxFaces, printCoverage: 'both' },
        layers: [insideLayer],
      })
    ).toBeUndefined();
  });

  it('still honors a persisted manifest flag when the structure is not a sheet', () => {
    expect(
      deriveUnsupportedArtwork({
        manifest: { unsupportedArtwork: { faces: ['inside_front'], layerCount: 2 } },
        model: { faces: [], printCoverage: 'outside' },
        layers: [],
      })
    ).toEqual({ faces: ['inside_front'], layerCount: 2 });
  });
});

describe('proof boundary', () => {
  const pngBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64),
  ]);

  it('readManifest derives unsupportedArtwork from the saved data, flag absent', () => {
    const manifest = readManifest(flaglessCardData);
    expect(manifest.unsupportedArtwork).toEqual({ faces: ['inside_front'], layerCount: 1 });
  });

  it('composeProofPdf refuses the flag-absent card instead of silently omitting the inside artwork', async () => {
    const manifest = readManifest(flaglessCardData);
    await expect(
      composeProofPdf(pngBuffer, { orderNumber: 'TEST-1', items: [], manifest })
    ).rejects.toThrow(/Proof blocked: .*inside faces \(inside_front\)/);
  });

  it('composeProofPdf does not block a normal box manifest', async () => {
    const manifest = readManifest({
      manifest: { faces: { front: { w: 115, h: 38 } } },
      model: {
        faces: ['front', 'back', 'left', 'right', 'top', 'bottom'].map((id) => ({ id, name: id })),
        printCoverage: 'outside',
      },
      layers: [frontLayer],
    });
    expect(manifest.unsupportedArtwork).toBeUndefined();
    const outcome = await composeProofPdf(pngBuffer, {
      orderNumber: 'TEST-2',
      items: [],
      manifest,
    }).then(
      () => 'resolved',
      (error: Error) => error.message
    );
    expect(outcome).not.toMatch(/Proof blocked/);
  });
});

describe('malformed duplicate sheet faces', () => {
  it('does not let duplicate outside face entries bypass the output guard', () => {
    expect(deriveUnsupportedArtwork({model:{faces:[{id:'front'},{id:'front'},{id:'back'}]},layers:[{faceId:'inside_front'}]})).toEqual({faces:['inside_front'],layerCount:1});
  });
});


describe('stand-up pouch preview-surface boundary',()=>{
 const data={schemaVersion:2,model:{type:'stand_up_pouch',faces:['front','back','left','right','top','bottom'].map(id=>({id}))},layers:[{faceId:'front'},{faceId:'left'}],manifest:{faces:{front:{w:150,h:220},left:{w:50,h:220}}}}
 it('derives unsupported saved legacy side artwork without relying on manifest flag',()=>{
  expect(deriveUnsupportedArtwork(data)).toEqual({faces:['left'],layerCount:1,product:'stand_up_pouch'})
  expect(deriveUnsupportedArtwork({...data,layers:[{faceId:'front'},{faceId:'back'}]})).toBeUndefined()
  expect(deriveUnsupportedArtwork({...data,model:{...data.model,type:'doypack_pouch'}})).toBeUndefined()
  expect(deriveUnsupportedArtwork({...data,model:{...data.model,type:undefined},manifest:{...data.manifest,product:{boxType:'stand-up-pouch'}}})).toMatchObject({product:'stand_up_pouch',faces:['left']})
  expect(deriveUnsupportedArtwork({...data,model:{...data.model,type:undefined},product:{id:'prod-stand-up-pouch'}})).toMatchObject({product:'stand_up_pouch',faces:['left']})
 })
 it('matches legacy missing-face migration but never discards explicit side artwork',()=>{
  expect(deriveUnsupportedArtwork({...data,layers:[{}, {faceId:undefined}, {faceId:''}]})).toBeUndefined()
  expect(deriveUnsupportedArtwork({...data,layers:[{}, {faceId:'left'}]})).toMatchObject({faces:['left'],layerCount:1,product:'stand_up_pouch'})
 })
 it('blocks actual proof generation for a flagless pouch instead of fabricating side plates',async()=>{
  await expect(composeProofPdf(Buffer.alloc(0),{orderNumber:'POUCH-TEST',items:[],manifest:readManifest(data)})).rejects.toThrow(/Proof blocked: This stand-up pouch/)
 })
})

describe('frosted ziplock bag preview-surface boundary',()=>{
 const data={schemaVersion:2,model:{type:'frosted_ziplock_bag',faces:[{id:'front'},{id:'back'}]},product:{id:'prod-frosted-ziplock-bag',boxType:'frosted-ziplock-bag'},layers:[{faceId:'front'},{faceId:'inside_front'}],manifest:{faces:{front:{w:200,h:300},back:{w:200,h:300}}}}
 it('derives unsupported saved artwork from the design data with no manifest flag',()=>{
  expect(deriveUnsupportedArtwork(data)).toEqual({faces:['inside_front'],layerCount:1,product:'frosted_ziplock_bag'})
  expect(deriveUnsupportedArtwork({...data,layers:[{faceId:'front'},{faceId:'back'}]})).toBeUndefined()
  expect(deriveUnsupportedArtwork({...data,model:{...data.model,type:undefined},product:{id:'prod-frosted-ziplock-bag'}})).toMatchObject({product:'frosted_ziplock_bag',faces:['inside_front']})
  expect(deriveUnsupportedArtwork({...data,model:{...data.model,type:undefined},product:{boxType:'frosted-ziplock-bag'}})).toMatchObject({product:'frosted_ziplock_bag'})
  expect(deriveUnsupportedArtwork({...data,model:{...data.model,type:'poly_mailer_bag',faces:['front','back','left','right','top','bottom'].map(id=>({id}))},product:{id:'prod-poly-mailer',boxType:'poly-mailer-bag'}})).toBeUndefined()
 })
 it('matches legacy missing-face migration but never discards explicit unsupported artwork',()=>{
  expect(deriveUnsupportedArtwork({...data,layers:[{}, {faceId:undefined}, {faceId:''}]})).toBeUndefined()
  expect(deriveUnsupportedArtwork({...data,layers:[{}, {faceId:'top'}]})).toMatchObject({faces:['top'],layerCount:1,product:'frosted_ziplock_bag'})
 })
 it('honors a persisted ziplock manifest flag on a non-sheet shape',()=>{
  expect(deriveUnsupportedArtwork({manifest:{unsupportedArtwork:{faces:['top'],layerCount:1,product:'frosted_ziplock_bag'}},layers:[]})).toEqual({faces:['top'],layerCount:1,product:'frosted_ziplock_bag'})
 })
 it('blocks actual proof generation for a flagless ziplock design instead of omitting the unrepresented artwork',async()=>{
  await expect(composeProofPdf(Buffer.alloc(0),{orderNumber:'ZIPLOCK-TEST',items:[],manifest:readManifest(data)})).rejects.toThrow(/Proof blocked: This frosted ziplock bag/)
 })
})
