import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateBarcode,qrArtworkPlan,barcodeArtworkPlan,CodeArtworkError} from '../lib/editor/code-artwork.ts'
test('QR planner preserves exact payload bytes and creates whole modules with quiet zone',()=>{
 for(const text of ['https://example.com/a?x=1&y=2','مرحبا بالعالم 😀','  payload with spaces  ']){
  const p=qrArtworkPlan(text,150);assert.equal(p.width%(p.qr.modules.size+8),0);assert.ok(p.scale>=2)
  const bytes=p.qr.segments.flatMap(s=>'data'in s?Array.from(s.data as Uint8Array):[])
  if(/مرحبا/.test(text))assert.deepEqual(Buffer.from(bytes),Buffer.from(text))
 }
})
test('QR rejects blank, oversized payload and unsafe contrast without silently changing values',()=>{
 for(const text of ['', ' '.repeat(10),'a'.repeat(4000)])assert.throws(()=>qrArtworkPlan(text,150),CodeArtworkError)
 assert.throws(()=>qrArtworkPlan('test',150,'#ffffff','#000000'),CodeArtworkError)
 assert.throws(()=>qrArtworkPlan('test',150,'#dddddd','#ffffff'),CodeArtworkError)
})
test('EAN13 and UPCA accept complete correct check digits only',()=>{
 for(const [kind,good,bad] of [['ean13','5901234123457','5901234123458'],['upc','036000291452','036000291453']] as const){
  assert.doesNotThrow(()=>validateBarcode(good,kind));for(const value of [bad,good.slice(0,-1),good+'0',' '+good])assert.throws(()=>validateBarcode(value,kind),CodeArtworkError)
  const p=barcodeArtworkPlan(good,kind,200,80);assert.ok(p.scale>=2);assert.ok(p.width>=200);assert.match(p.bits,/^[01]+$/)
 }
})
test('Code128 preserves mixedcase, supports printableASCII, rejects Unicode/control/long payload',()=>{
 const a=barcodeArtworkPlan('Abc-123','code128',200,80),b=barcodeArtworkPlan('ABC-123','code128',200,80);assert.notEqual(a.bits,b.bits)
 for(const text of ['مرحبا','abc\n','x'.repeat(81)])assert.throws(()=>validateBarcode(text,'code128'),CodeArtworkError)
 assert.doesNotThrow(()=>validateBarcode('  Abc-123  ','code128'))
})
