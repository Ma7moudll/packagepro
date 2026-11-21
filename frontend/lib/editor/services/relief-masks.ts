import type { Layer, ModelState } from "../state/types"
import { getFaceDimensions } from "./texture-generator"
import { PX_PER_MM } from "../geometry/units"

/** Visual relief mask only. No production height or print method is inferred.
 * The first exact matching text portion is previewed; repeated placement and
 * complex shaping still require a production mask before manufacturing. */
export function generateReliefMasks(layers: Layer[], model: ModelState): Record<string,string> {
 const result:Record<string,string>={}
 if(typeof document==="undefined")return result
 for(const face of model.faces){
  const targets=layers.filter(l=>l.visible&&l.faceId===face.id&&l.type==="text"&&l.textProperties&&l.raisedPrint?.text&&l.textProperties.content.includes(l.raisedPrint.text))
  if(!targets.length)continue
  const dim=getFaceDimensions(face.id,model.dimensions),scale=4
  const canvas=document.createElement("canvas");canvas.width=dim.width*scale;canvas.height=dim.height*scale
  const ctx=canvas.getContext("2d")!;ctx.fillStyle="#808080";ctx.fillRect(0,0,canvas.width,canvas.height)
  for(const l of targets){
   const t=l.textProperties!,portion=l.raisedPrint!.text,index=t.content.indexOf(portion)
   ctx.save();ctx.translate(l.position.x/PX_PER_MM*scale,l.position.y/PX_PER_MM*scale);ctx.rotate(l.rotation);ctx.scale(l.scale.x/PX_PER_MM*scale,l.scale.y/PX_PER_MM*scale)
   ctx.font=`${t.fontWeight||400} ${t.fontSize}px ${t.fontFamily}`;ctx.textBaseline="middle";ctx.textAlign="center"
   const width=ctx.measureText(t.content).width,prefix=ctx.measureText(t.content.slice(0,index)).width,partWidth=ctx.measureText(portion).width
   const rtl=/[\u0590-\u08FF]/.test(t.content)
   ctx.direction=rtl?"rtl":"ltr"
   const start=rtl?width/2-prefix-partWidth:-width/2+prefix
   // Clip the complete shaped text so Arabic joining is retained. Exact
   // partial-glyph boundaries remain illustrative, never a production mask.
   ctx.beginPath();ctx.rect(start,-t.fontSize,partWidth,t.fontSize*2);ctx.clip()
   ctx.fillStyle="#ffffff";ctx.fillText(t.content,0,0);ctx.restore()
  }
  result[face.id]=canvas.toDataURL("image/png")
 }
 return result
}
