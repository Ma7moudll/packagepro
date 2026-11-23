import {describe,expect,it} from 'vitest';
import {deflateSync} from 'node:zlib';
import {PDFDocument,PDFName} from 'pdf-lib';
import {invoicePdfText} from './invoice-pdf.test-helper';

async function fixture(bytes:Buffer){
 const doc=await PDFDocument.create();const page=doc.addPage();
 const stream=doc.context.stream(bytes,{Filter:PDFName.of('FlateDecode')});
 page.node.set(PDFName.of('Contents'),doc.context.register(stream));
 return Buffer.from(await doc.save({useObjectStreams:false}));
}
const amount='Subtotal: EGP 100.00';
function trailingCRStream(){
 // Fixed ordered search, not random: zlib's checksum determines the final byte.
 for(let n=0;n<1024;n++){
  const content=Buffer.from(`BT <${Buffer.from(amount).toString('hex')}> Tj ET\n%${'a'.repeat(n)}`);
  const compressed=deflateSync(content);
  if(compressed[compressed.length-1]===13)return compressed;
 }
 throw new Error('Could not construct deterministic trailing-CR fixture');
}
describe('invoice PDF test reader',()=>{
 it('preserves a compressed stream ending in CR before the LF endstream separator',async()=>{
  const compressed=trailingCRStream();expect(compressed.at(-1)).toBe(13);
  const pdf=await fixture(compressed);
  // Ensure this actually exercises the ambiguous binary CR + separator LF.
  expect(pdf.includes(Buffer.concat([compressed,Buffer.from('\nendstream')]))).toBe(true);
  expect(await invoicePdfText(pdf)).toBe(amount);
 });
 it('rejects malformed PDF instead of returning empty text',async()=>{
  await expect(invoicePdfText(Buffer.from('%PDF-1.3\nnot-a-pdf'))).rejects.toThrow();
 });
 it('rejects corrupt compressed page contents loudly',async()=>{
  const compressed=trailingCRStream();compressed[compressed.length-1]^=0xff;
  await expect(invoicePdfText(await fixture(compressed))).rejects.toThrow();
 });
 it('rejects a PDF with no readable invoice text',async()=>{
  await expect(invoicePdfText(await fixture(deflateSync(Buffer.from('q Q'))))).rejects.toThrow('no readable hex text');
 });
});
