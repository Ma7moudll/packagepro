import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

export type BarcodeKind='code128'|'ean13'|'upc'
export class CodeArtworkError extends Error {
 code:'empty'|'capacity'|'colour'|'barcode'|'size'|'code128'|'ean13_length'|'upc_length'|'ean13_check'|'upc_check'
 constructor(code:CodeArtworkError['code']){super(code);this.code=code}
}
export function validateBarcode(text:string,type:BarcodeKind){
 if(!text.trim())throw new CodeArtworkError('empty')
 if(type==='code128'){
  if(text.length>80||!/^[\x20-\x7e]+$/.test(text))throw new CodeArtworkError('code128')
 }else{
  const length=type==='ean13'?13:12
  if(!new RegExp(`^[0-9]{${length}}$`).test(text))throw new CodeArtworkError(type==='ean13'?'ean13_length':'upc_length')
  const digits=text.split('').map(Number),check=digits.pop()!
  const sum=digits.reverse().reduce((n,d,i)=>n+d*(i%2===0?3:1),0)
  if((10-sum%10)%10!==check)throw new CodeArtworkError(type==='ean13'?'ean13_check':'upc_check')
 }
}
function luminance(hex:string){
 if(!/^#[0-9a-f]{6}$/i.test(hex))throw new CodeArtworkError('colour')
 const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4)
 return .2126*c[0]+.7152*c[1]+.0722*c[2]
}
export function qrArtworkPlan(text:string,size:number,foreground='#000000',background='#ffffff'){
 if(!text.trim())throw new CodeArtworkError('empty')
 if(![100,150,200,300].includes(size))throw new CodeArtworkError('size')
 const dark=luminance(foreground),light=luminance(background)
 if(light<=dark||(light+.05)/(dark+.05)<4.5)throw new CodeArtworkError('colour')
 let qr:ReturnType<typeof QRCode.create>
 try{qr=QRCode.create(text,{errorCorrectionLevel:'M'})}catch{throw new CodeArtworkError('capacity')}
 const modules=qr.modules.size+8,scale=Math.max(2,Math.ceil(size/modules))
 return {qr,scale,width:modules*scale,foreground,background}
}
export function barcodeArtworkPlan(text:string,type:BarcodeKind,width:number,height:number){
 validateBarcode(text,type)
 if(![150,200,250,300].includes(width)||![60,80,100,120].includes(height))throw new CodeArtworkError('size')
 const result:{encodings?:Array<{data:string;text:string}>}={}
 try{JsBarcode(result,text,{format:type==='code128'?'CODE128':type==='ean13'?'EAN13':'UPC',displayValue:false})}catch{throw new CodeArtworkError('barcode')}
 const bits=result.encodings?.map(e=>e.data).join('')
 if(!bits||!/^[01]+$/.test(bits))throw new CodeArtworkError('barcode')
 const quiet=12,scale=Math.max(2,Math.ceil(width/(bits.length+quiet*2)))
 return {bits,quiet,scale,width:(bits.length+quiet*2)*scale,height}
}
export function renderQRArtwork(text:string,size:number,foreground:string,background:string){
 const p=qrArtworkPlan(text,size,foreground,background),canvas=document.createElement('canvas');canvas.width=p.width;canvas.height=p.width
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable')
 ctx.fillStyle=background;ctx.fillRect(0,0,p.width,p.width);ctx.fillStyle=foreground
 for(let y=0;y<p.qr.modules.size;y++)for(let x=0;x<p.qr.modules.size;x++)if(p.qr.modules.get(y,x))ctx.fillRect((x+4)*p.scale,(y+4)*p.scale,p.scale,p.scale)
 return {src:canvas.toDataURL('image/png'),width:p.width,height:p.width,modulePixels:p.scale}
}
export function renderBarcodeArtwork(text:string,type:BarcodeKind,width:number,height:number){
 const p=barcodeArtworkPlan(text,type,width,height),canvas=document.createElement('canvas');canvas.width=p.width;canvas.height=p.height
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable')
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,p.width,p.height);ctx.fillStyle='#000000'
 for(let x=0;x<p.bits.length;x++)if(p.bits[x]==='1')ctx.fillRect((x+p.quiet)*p.scale,6,p.scale,p.height-26)
 ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText(text,p.width/2,p.height-6)
 return {src:canvas.toDataURL('image/png'),width:p.width,height:p.height,modulePixels:p.scale}
}
