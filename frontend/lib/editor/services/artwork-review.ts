"use client"

import * as fabric from "fabric"
import jsPDF from "jspdf"
import type { DesignDataV2 } from "./dieline-manifest"
import type { Layer } from "../state/types"
import { assertReviewInput, stableJson, reviewSnapshot, REVIEW_ROLE, REVIEW_DPI, REVIEW_FACES, F42_GEOMETRY_SHA256 } from "../../../../backend/src/modules/designs/artwork-review-contract"

export { assertReviewInput, reviewSnapshot }
export const reviewHash = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), b => b.toString(16).padStart(2,"0")).join("")

export async function renderArtworkReview(data: DesignDataV2): Promise<{blob: Blob; snapshotHash: string; pixels: Record<string,{width:number;height:number}>}> {
  assertReviewInput(data)
  const geometry = data.manifest.dieline!
  if (await reviewHash(stableJson(geometry)) !== F42_GEOMETRY_SHA256) throw new Error("Review PDF unavailable: geometry does not match the verified F42 preset")
  const snapshotHash = await reviewHash(reviewSnapshot(data))
  const pdf = new jsPDF({unit:"mm",format:[390,218],orientation:"landscape",compress:true})
  pdf.setProperties({title:"F42 artwork review",subject:`${REVIEW_ROLE}:${snapshotHash}`,creator:"PackagePro review export"})
  pdf.setFontSize(12); pdf.text("F42 ARTWORK REVIEW | OUTSIDE | RGB | NOT FOR PRODUCTION",10,8)
  pdf.setFontSize(8); pdf.text("115 x 70 x 38 mm mailer. Canonical layout 370 x 178 mm. Artwork trimmed to panels; no production bleed.",10,15)
  pdf.text(`Saved artwork: ${snapshotHash}`,10,21)
  const pixels: Record<string,{width:number;height:number}> = {}
  for (const id of REVIEW_FACES) {
    const panel = geometry.panels[id]
    const cw = panel.w*3, ch = panel.h*3
    const canvas = new fabric.StaticCanvas(undefined,{width:cw,height:ch,backgroundColor:(data.canvas as any).backgroundColor,enableRetinaScaling:false,renderOnAddRemove:false})
    try {
      for (const layer of (data.layers as Layer[]).filter(l=>l.visible && l.faceId===id)) {
        const common = {left:layer.position.x,top:layer.position.y,angle:layer.rotation*180/Math.PI,scaleX:layer.scale.x,scaleY:layer.scale.y,opacity:layer.opacity,originX:"center" as const,originY:"center" as const}
        let object: fabric.FabricObject
        if (layer.type === "text") {
          const p=layer.textProperties!
          await document.fonts.load(`${p.fontWeight} ${p.fontSize}px ${p.fontFamily}`,p.content)
          await document.fonts.ready
          if (!document.fonts.check(`${p.fontWeight} ${p.fontSize}px ${p.fontFamily}`,p.content)) throw new Error(`Font unavailable: ${layer.name || layer.id}`)
          object = new fabric.Text(p.content,{...common,fontFamily:p.fontFamily,fontWeight:p.fontWeight,fontSize:p.fontSize,fill:p.color,lineHeight:p.lineHeight||1.2,textAlign:p.align||"left"})
        } else if (layer.type === "image") {
          let image: fabric.FabricImage
          try { image = await fabric.FabricImage.fromURL(layer.imageProperties!.src) }
          catch { throw new Error(`Embedded image unavailable: ${layer.name || layer.id}`) }
          if (!image.width || !image.height) throw new Error(`Image unavailable: ${layer.name || layer.id}`)
          image.set(common); object=image
        } else {
          const p=layer.shapeProperties!
          const style={...common,fill:p.fill,stroke:p.stroke||"",strokeWidth:p.strokeWidth}
          object=p.shape==="rect" ? new fabric.Rect({...style,width:100,height:100,rx:p.cornerRadius||0}) : new fabric.Circle({...style,radius:50})
        }
        const bounds=object.getBoundingRect()
        if (bounds.left < -0.01 || bounds.top < -0.01 || bounds.left+bounds.width > cw+0.01 || bounds.top+bounds.height > ch+0.01) throw new Error(`Review PDF unavailable: ${layer.name || layer.id} extends beyond its panel; production bleed is not supported`)
        canvas.add(object)
      }
      canvas.renderAll()
      const multiplier=Math.max(Math.ceil(panel.w*REVIEW_DPI/25.4)/cw,Math.ceil(panel.h*REVIEW_DPI/25.4)/ch)+0.000001
      const raster=canvas.toCanvasElement(multiplier)
      pixels[id]={width:raster.width,height:raster.height}
      if (raster.width*25.4/panel.w < REVIEW_DPI || raster.height*25.4/panel.h < REVIEW_DPI) throw new Error("Review sampling check failed")
      pdf.addImage(raster.toDataURL("image/png"),"PNG",10+panel.x,30+panel.y,panel.w,panel.h,undefined,"FAST")
    } finally { await canvas.dispose() }
  }
  for (const [kind,paths] of Object.entries({cut:geometry.cutPaths,fold:geometry.foldPaths,score:geometry.scorePaths,glue:geometry.gluePaths,perf:geometry.perfPaths,outline:geometry.outline})) {
    pdf.setDrawColor(kind==="cut"?20:120);pdf.setLineWidth(kind==="cut"?0.2:0.12);pdf.setLineDashPattern(kind==="cut"?[]:[1.5,1],0)
    for (const p of paths) {
      const points=p.closed?[...p.points,p.points[0]]:p.points
      for(let i=1;i<points.length;i++) pdf.line(10+points[i-1].x,30+points[i-1].y,10+points[i].x,30+points[i].y)
    }
  }
  pdf.setLineDashPattern([],0)
  return {blob:pdf.output("blob"),snapshotHash,pixels}
}

export const blobBase64 = (blob:Blob) => new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=()=>reject(new Error("Could not read review PDF"));reader.readAsDataURL(blob)})

export async function downloadStoredReview(artifact: {fileName:string;pdfBase64:string;sha256:string}) {
  const bytes=Uint8Array.from(atob(artifact.pdfBase64),c=>c.charCodeAt(0))
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("")
  if (hash!==artifact.sha256) throw new Error("Stored review checksum mismatch")
  const url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}))
  const a=document.createElement("a");a.href=url;a.download=artifact.fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
