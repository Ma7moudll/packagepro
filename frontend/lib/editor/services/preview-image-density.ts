// Stamp output density on our own canvas-encoded PNG/JPEG bytes. This does not
// increase or certify source-asset detail. Pixel dimensions are checked separately.
function crc32(bytes: Uint8Array): number {
  let crc=0xffffffff
  for(const byte of bytes) {crc^=byte; for(let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  return (crc^0xffffffff)>>>0
}
function concat(parts: Uint8Array[]): Uint8Array {
  const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0
  for(const part of parts){out.set(part,offset);offset+=part.length}return out
}
const text=(bytes:Uint8Array)=>String.fromCharCode(...bytes)
export function stampPreviewDensity(bytes: Uint8Array, mime: "image/png"|"image/jpeg", density: number): Uint8Array {
  if (![72,150,300,600].includes(density)) throw new Error("Unsupported preview output density")
  if(mime==="image/png") {
    if(bytes.length<33 || text(bytes.subarray(1,4))!=="PNG" || bytes[0]!==137) throw new Error("PNG encoding failed")
    const chunk=new Uint8Array(21),view=new DataView(chunk.buffer)
    view.setUint32(0,9);chunk.set([112,72,89,115],4)
    view.setUint32(8,Math.round(density/0.0254));view.setUint32(12,Math.round(density/0.0254));chunk[16]=1
    view.setUint32(17,crc32(chunk.subarray(4,17)))
    const parts=[bytes.subarray(0,8)];let offset=8,inserted=false,ended=false
    const input=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
    while(offset+12<=bytes.length){
      const size=input.getUint32(offset),end=offset+size+12
      if(end>bytes.length) throw new Error("Invalid PNG chunk")
      const type=text(bytes.subarray(offset+4,offset+8))
      if(type!=="pHYs") parts.push(bytes.subarray(offset,end))
      if(type==="IHDR"){parts.push(chunk);inserted=true}
      offset=end
      if(type==="IEND"){ended=true;break}
    }
    if(!inserted || !ended || offset!==bytes.length) throw new Error("Invalid PNG structure")
    return concat(parts)
  }
  if(bytes.length<4 || bytes[0]!==255 || bytes[1]!==216 || bytes[bytes.length-2]!==255 || bytes[bytes.length-1]!==217) throw new Error("JPEG encoding failed")
  const out=bytes.slice();const input=new DataView(out.buffer);let offset=2
  while(offset+4<=out.length && out[offset]===255){
    const marker=out[offset+1];if(marker===218 || marker===217) break
    const size=input.getUint16(offset+2)
    if(size<2 || offset+size+2>out.length) throw new Error("Invalid JPEG segment")
    if(marker===224 && size>=16 && text(out.subarray(offset+4,offset+9))==="JFIF\0"){
      out[offset+11]=1;input.setUint16(offset+12,density);input.setUint16(offset+14,density);return out
    }
    offset+=size+2
  }
  const jfif=new Uint8Array([255,224,0,16,74,70,73,70,0,1,2,1,0,0,0,0,0,0])
  const view=new DataView(jfif.buffer);view.setUint16(12,density);view.setUint16(14,density)
  return concat([bytes.subarray(0,2),jfif,bytes.subarray(2)])
}
