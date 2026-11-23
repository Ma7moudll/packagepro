"use client"

import { useDesignStore } from "@/lib/editor/state/store"
import { assertNoUnsupportedSheetArtwork } from "@/lib/editor/print-coverage"
import type { Layer } from "@/lib/editor/state/types"
import { generateTextureFromLayers } from "./texture-generator"
import { assertPreviewLayers, isSolidPreviewColor, previewFacePlan, PREVIEW_MARGIN_MM, PREVIEW_HEADER_MM } from "./preview-export-contract"
import { stampPreviewDensity } from "./preview-image-density"
import jsPDF from "jspdf"

export interface ExportOptions {
  format: "pdf" | "png" | "jpg" | "svg" | "ai" | "eps"
  resolution: 72 | 150 | 300 | 600 // actual output sampling at the face's model mm
  colorMode: "rgb" | "cmyk"
  includeBleed: boolean
  bleedSize: number
  includeCropMarks: boolean
  includeDieLines: boolean
  flattenLayers: boolean
  faceId?: string // single-face PNG/JPEG only
}
const defaultExportOptions: ExportOptions = {
  format:"pdf",resolution:300,colorMode:"rgb",includeBleed:false,bleedSize:0,
  includeCropMarks:false,includeDieLines:false,flattenLayers:true,
}
type Plan = ReturnType<typeof previewFacePlan>

const timeout = async <T,>(work:Promise<T>, message:string):Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try { return await Promise.race([work,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),10000)})]) }
  finally {if(timer) clearTimeout(timer)}
}

export async function exportDesign(options: Partial<ExportOptions> = {}): Promise<Blob> {
  const opts={...defaultExportOptions,...options}
  if (!["pdf","png","jpg","svg"].includes(opts.format)) throw new Error("Preview unavailable: AI/EPS output is not implemented")
  if(opts.colorMode!=="rgb") throw new Error("Preview unavailable: CMYK conversion is not supported; choose RGB")
  if(opts.includeBleed) throw new Error("Preview unavailable: production bleed is not supported; artwork is trimmed to face bounds")
  if(!opts.flattenLayers) throw new Error("Preview unavailable: editable artwork layers are not supported")
  const single=opts.format==="png" || opts.format==="jpg"
  if(single && (opts.includeCropMarks || opts.includeDieLines)) throw new Error("Preview unavailable: image previews do not include reference guides")
  const state=useDesignStore.getState()
  // Shared output boundary: a two-face sheet carrying inside-face artwork
  // must not produce a file that omits it (outside coverage) or fabricates
  // inside plates for it (both coverage). Refuse before rendering anything.
  assertNoUnsupportedSheetArtwork(state.model.faces, state.layers, state.model.type)
  // Capture one immutable local preview, not a later live state or a claimed save.
  const model=structuredClone(state.model),canvas=structuredClone(state.canvas)
  const coverage=model.printCoverage ?? "outside"
  if(!["outside","inside","both"].includes(coverage)) throw new Error("Preview unavailable: unsupported print coverage")
  const available=new Set(model.faces.map(f=>f.id))
  if(coverage==="both" && model.faces.some(f=>!available.has((f.id.startsWith("inside_")?f.id.slice(7):"inside_"+f.id) as typeof f.id))) throw new Error("Preview unavailable: both-side coverage requires matching saved inside and outside faces")
  if(coverage==="inside" && !model.faces.some(f=>f.id.startsWith("inside_"))) throw new Error("Preview unavailable: saved inside faces are missing")
  let faces=model.faces.filter(f=>coverage==="both" || (coverage==="inside")===f.id.startsWith("inside_"))
  if(single) {
    const chosen=opts.faceId ?? faces[0]?.id
    faces=faces.filter(f=>f.id===chosen)
  }
  const plan=previewFacePlan(model.dimensions,faces,opts.resolution)
  const visible=structuredClone(state.layers).filter(l=>l.visible)
  if(visible.some(l=>!available.has(l.faceId))) throw new Error("Preview unavailable: visible artwork refers to a missing face")
  const layers=visible.filter(l=>l.visible && faces.some(f=>f.id===l.faceId))
  assertPreviewLayers(layers)
  if(canvas.backgroundImage) throw new Error("Preview unavailable: canvas background images are not supported")
  if(!isSolidPreviewColor(canvas.backgroundColor) || (typeof CSS!=="undefined" && !CSS.supports("color",canvas.backgroundColor))) throw new Error("Preview unavailable: a solid canvas background color is required")
  if(typeof CSS!=="undefined") for(const layer of layers) {
    const colors=layer.type==="text"?[layer.textProperties!.color]:layer.type==="shape"?[layer.shapeProperties!.fill,layer.shapeProperties!.stroke].filter(Boolean):[]
    if(colors.some(color=>!CSS.supports("color",color))) throw new Error(`Preview unavailable: invalid color on ${layer.name || layer.id}`)
  }
  await prepareFonts(layers)
  const textures=await generateTextureFromLayers(layers,{...model,faces},{scale:opts.resolution/25.4,strictAssets:true,includeEmptyFaces:true,backgroundColor:canvas.backgroundColor})
  for(const p of plan) {
    if(!textures[p.face.id]) throw new Error(`Preview unavailable: missing face ${p.face.name}`)
    // PNG IHDR dimensions are authoritative, not the requested canvas options.
    const bytes=dataUrlBytes(textures[p.face.id],"image/png")
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
    if(bytes.length<24 || view.getUint32(16)!==p.pixels.width || view.getUint32(20)!==p.pixels.height) throw new Error("Preview unavailable: output sampling does not match the requested density")
  }
  if(opts.format==="pdf") return exportPDF(plan,textures,opts)
  if(opts.format==="svg") return exportSVG(plan,textures,opts)
  return exportImage(plan[0],textures[plan[0].face.id],opts)
}

async function prepareFonts(layers: Layer[]) {
  const texts=layers.filter(l=>l.type==="text")
  if(!texts.length) return
  if(!document.fonts) throw new Error("Preview unavailable: browser font readiness cannot be checked")
  await timeout(Promise.all(texts.map(async layer=>{
    const p=layer.textProperties!
    const font=`${p.fontWeight} ${p.fontSize}px ${p.fontFamily}`
    await document.fonts.load(font,p.content)
    if(!document.fonts.check(font,p.content)) throw new Error(`Preview unavailable: font for ${layer.name || layer.id} is unavailable`)
  })),"Preview unavailable: font loading timed out")
  await timeout(document.fonts.ready,"Preview unavailable: font loading timed out")
}
function dataUrlBytes(url:string,mime:string):Uint8Array {
  const prefix=`data:${mime};base64,`
  if(!url.startsWith(prefix)) throw new Error(`Preview unavailable: ${mime} encoding failed`)
  return Uint8Array.from(atob(url.slice(prefix.length)),c=>c.charCodeAt(0))
}
function escapeXml(value:string):string {return value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[c]!))}

function exportPDF(plan:Plan,textures:Record<string,string>,options:ExportOptions):Blob {
  const first=plan[0]
  const pageOptions=(p:Plan[number])=>({format:[p.pageWidthMm,p.pageHeightMm],orientation:(p.pageWidthMm>=p.pageHeightMm?"landscape":"portrait") as "landscape"|"portrait"})
  const pdf=new jsPDF({unit:"mm",compress:true,...pageOptions(first)})
  pdf.setProperties({title:"PackagePro RGB face preview",subject:"Reference only. Not for production. Separate face pages, not a registered dieline.",creator:"PackagePro Editor"})
  plan.forEach((p,i)=>{
    if(i) {const page=pageOptions(p);pdf.addPage(page.format,page.orientation)}
    pdf.setFontSize(9);pdf.setTextColor(0)
    pdf.text("RGB FACE PREVIEW | NOT FOR PRODUCTION",PREVIEW_MARGIN_MM,8)
    pdf.setFontSize(8)
    pdf.text(`${p.face.id} | ${p.widthMm} x ${p.heightMm} mm`,PREVIEW_MARGIN_MM,15)
    pdf.setFontSize(7)
    pdf.text(`${options.resolution} PPI output sampling. Trimmed artwork; no production bleed.`,PREVIEW_MARGIN_MM,21)
    const x=(p.pageWidthMm-p.widthMm)/2,y=PREVIEW_HEADER_MM
    pdf.addImage(textures[p.face.id],"PNG",x,y,p.widthMm,p.heightMm,undefined,"FAST")
    if(options.includeCropMarks) addReferenceMarks(pdf,x,y,p.widthMm,p.heightMm)
    if(options.includeDieLines) {pdf.setDrawColor(180);pdf.setLineWidth(.12);pdf.setLineDashPattern([1.5,1],0);pdf.rect(x,y,p.widthMm,p.heightMm);pdf.setLineDashPattern([],0)}
  })
  return pdf.output("blob")
}
function addReferenceMarks(pdf:jsPDF,x:number,y:number,w:number,h:number) {
  pdf.setDrawColor(120);pdf.setLineWidth(.1)
  for(const [cx,cy,sx,sy]of[[x,y,-1,-1],[x+w,y,1,-1],[x,y+h,-1,1],[x+w,y+h,1,1]]){
    pdf.line(cx+sx*1,cy,cx+sx*5,cy);pdf.line(cx,cy+sy*1,cx,cy+sy*5)
  }
}
function exportSVG(plan:Plan,textures:Record<string,string>,options:ExportOptions):Blob {
  const width=Math.max(...plan.map(p=>p.pageWidthMm)),height=plan.reduce((n,p)=>n+p.pageHeightMm,0)
  let offset=0
  const sections=plan.map(p=>{
    const x=(width-p.widthMm)/2,y=offset+PREVIEW_HEADER_MM
    const label=`${p.face.id} | ${p.face.name} | ${p.widthMm} x ${p.heightMm} mm | ${options.resolution} PPI`
    let marks=""
    if(options.includeDieLines) marks+=`<rect x="${x}" y="${y}" width="${p.widthMm}" height="${p.heightMm}" fill="none" stroke="#999" stroke-width="0.12" stroke-dasharray="1.5 1"/>`
    if(options.includeCropMarks) for(const[cx,cy,sx,sy]of[[x,y,-1,-1],[x+p.widthMm,y,1,-1],[x,y+p.heightMm,-1,1],[x+p.widthMm,y+p.heightMm,1,1]]) marks+=`<path d="M${cx+sx} ${cy}H${cx+sx*5} M${cx} ${cy+sy}V${cy+sy*5}" fill="none" stroke="#888" stroke-width="0.1"/>`
    const section=`<g data-face="${p.face.id}"><text x="10" y="${offset+8}" font-size="3">RGB FACE PREVIEW | NOT FOR PRODUCTION</text><text x="10" y="${offset+15}" font-size="2.5">${escapeXml(label)}</text><image href="${textures[p.face.id]}" x="${x}" y="${y}" width="${p.widthMm}" height="${p.heightMm}" preserveAspectRatio="none"/>${marks}</g>`
    offset+=p.pageHeightMm;return section
  })
  return new Blob([`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><title>RGB separate-face preview, not a production dieline</title><desc>Raster artwork with vector reference labels/guides. No production bleed, color conversion or certification.</desc>${sections.join("")}</svg>`],{type:"image/svg+xml"})
}
async function exportImage(face:Plan[number],png:string,options:ExportOptions):Promise<Blob> {
  const mime=options.format==="jpg"?"image/jpeg":"image/png"
  let bytes=dataUrlBytes(png,"image/png")
  if(mime==="image/jpeg") {
    const image=new Image()
    await timeout(new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("Preview unavailable: JPEG source could not be decoded"));image.src=png}),"Preview unavailable: image decoding timed out")
    const canvas=document.createElement("canvas");canvas.width=face.pixels.width;canvas.height=face.pixels.height
    const ctx=canvas.getContext("2d");if(!ctx) throw new Error("Preview unavailable: JPEG canvas is unavailable")
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0)
    bytes=dataUrlBytes(canvas.toDataURL(mime,.92),mime)
  }
  return new Blob([stampPreviewDensity(bytes,mime,options.resolution) as Uint8Array<ArrayBuffer>],{type:mime})
}
export async function export3DPreviews(): Promise<Record<string,string>> {return {}}
