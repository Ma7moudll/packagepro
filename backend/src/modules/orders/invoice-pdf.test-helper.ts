import {inflateSync} from 'node:zlib';
import {PDFArray, PDFDocument, PDFName, PDFRawStream} from 'pdf-lib';

// Test-only reader for PDFKit's hex-encoded text. PDF parsing owns the binary
// stream boundaries; a regex must not consume a compressed trailing CR byte.
export async function invoicePdfText(pdf:Buffer):Promise<string>{
 const document=await PDFDocument.load(pdf,{throwOnInvalidObject:true});
 let text='';
 for(const page of document.getPages()){
  const contents=page.node.Contents();
  if(!contents)throw new Error('Invoice PDF has no page contents');
  const streams=contents instanceof PDFArray?contents.asArray():[contents];
  for(const reference of streams){
   const stream=document.context.lookup(reference);
   if(!(stream instanceof PDFRawStream))throw new Error('Invoice page content is not a raw stream');
   const filter=stream.dict.get(PDFName.of('Filter'));
   if(!(filter instanceof PDFName)||filter.asString()!=='/FlateDecode')throw new Error('Unsupported invoice PDF content filter');
   // Node zlib rejects corrupt/truncated compressed bytes instead of silently
   // swallowing extraction errors. Amount assertions still read the real PDF.
   const content=inflateSync(Buffer.from(stream.contents)).toString('latin1');
   for(const hex of content.matchAll(/<([a-fA-F0-9]+)>/g))text+=Buffer.from(hex[1],'hex').toString('latin1');
  }
 }
 if(!text)throw new Error('Invoice PDF has no readable hex text');
 return text;
}
