"use client"
import { Input } from "@/components/ui/input"
import type { Layer } from "@/lib/editor/state/types"
export function RaisedPrintControl({layer,arabic,update}:{layer:Layer;arabic:boolean;update:(id:string,fn:(l:Layer)=>Layer)=>void}) {
 if(layer.type!=="text"||!layer.textProperties)return null
 const target=layer.raisedPrint?.text||""
 const valid=!target||layer.textProperties.content.includes(target)
 return <div className="border-t pt-3 space-y-2">
  <label className="block text-[11px]">{arabic?"كلمة أو جزء بارز من النص":"Raised word or text portion"}<Input aria-label="Raised text portion" value={target} placeholder={arabic?"اكتب الجزء المطلوب بروزه":"Enter the text portion to raise"} maxLength={200} onChange={e=>update(layer.id,l=>({...l,raisedPrint:e.target.value?{text:e.target.value,method:"unspecified"}:undefined}))}/></label>
  {!valid&&<p role="alert" className="text-[10px] text-red-700">{arabic?"الجزء المحدد غير موجود في النص الحالي.":"The specified portion is not in the current text."}</p>}
  <p className="text-[10px] text-slate-500">{arabic?"معاينة بروز انتقائي فقط. طريقة التنفيذ وارتفاع البروز ومكان التكرارات تحتاج تأكيدا قبل الإنتاج؛ لم يتم تحديد حبر بارز أو كبس الورق.":"Selective relief preview only. Production method, height and repeated-word placement need confirmation. Raised ink versus paper embossing is not yet specified."}</p>
 </div>
}
