"use client"
import { useDesignStore } from "@/lib/editor/state/store"
import { LINERS, initialBoardSpecification, type BoardSpecification, type LinerId } from "@/lib/editor/material-specification"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function BoardSpecificationPanel({arabic}:{arabic:boolean}) {
 const model=useDesignStore(s=>s.model),apply=useDesignStore(s=>s.applyCoreState)
 const spec=model.boardSpecification
 const write=(next:BoardSpecification)=>{
  const selectedLayerIds=useDesignStore.getState().selectedLayerIds
  apply(s=>({...s,selectedLayerIds,model:{...s.model,boardSpecification:next}}))
 }
 if(!spec)return <div className="border-t pt-3 space-y-2"><Button variant="outline" size="sm" className="w-full text-xs" onClick={()=>write(initialBoardSpecification(model.material))}>{arabic?"تخصيص الخامة من الداخل والخارج":"Configure inside and outside stock"}</Button><p className="text-[10px] text-slate-500">{arabic?"مواصفات تصنيع مستقلة، تحتاج عرض سعر قبل الطلب.":"Independent manufacturing specification. A quote is required before ordering."}</p></div>
 return <fieldset className="border-t pt-3 space-y-3" aria-label={arabic?"مواصفات الخامة والطباعة":"Stock and printing specification"}>
  {!model.type.includes("mailer")&&<p role="status" className="text-[10px] text-amber-800">{arabic?"المعاينة المستقلة للخامة مدعومة لعلبة البريد فقط حاليا؛ تحفظ المواصفات لباقي المنتجات بدون معاينة مطابقة.":"Independent stock preview currently supports mailer boxes only. Other products save the specification without a matching preview."}</p>}
  <legend className="text-xs font-semibold">{arabic?"الخامة والطباعة":"Stock and printing"}</legend>
  {(["outside","inside"] as const).map(side=><label key={side} className="block text-[11px] space-y-1"><span>{side==="outside"?(arabic?"الخارج":"Outside liner"):(arabic?"الداخل":"Inside liner")}</span><select aria-label={side==="outside"?"Outside liner":"Inside liner"} className="w-full border rounded-md p-2 bg-white" value={spec[side]} onChange={e=>write({...spec,[side]:e.target.value as LinerId})}>{LINERS.map(l=><option key={l.id} value={l.id}>{arabic?l.ar:l.en}</option>)}</select></label>)}
  {(spec.outside==="kraft-water-resistant"||spec.inside==="kraft-water-resistant")&&<p className="text-[10px] text-amber-800">{arabic?"مطلوب للاستخدام في الثلاجات حسب وصف الخامة. لم يتم اعتماد درجة العزل أو ملاءمة ملامسة الطعام.":"Requested for refrigerator use. Water resistance, cold-use and food-contact ratings are not verified."}</p>}
  <div className="space-y-1"><span className="text-[11px]">{arabic?"إضافات السطح":"Surface additions"}</span>{(["cellophane","uv"] as const).map(k=><label key={k} className="flex gap-2 text-[11px]"><input type="checkbox" checked={spec.coatings[k]} onChange={e=>write({...spec,coatings:{...spec.coatings,[k]:e.target.checked}})}/>{k==="uv"?"UV":(arabic?"طبقة سولوفان":"Cellophane layer")}</label>)}<p className="text-[10px] text-slate-500">{arabic?"مساحة الإضافة وتشطيبها تحدد في مواصفات الإنتاج. المعاينة تقريبية.":"Coating area and finish need production confirmation. Preview is approximate."}</p></div>
  <label className="block text-[11px] space-y-1"><span>{arabic?"عدد ألوان الطباعة":"Print colour count"}</span><select aria-label="Print colour count" className="w-full border rounded-md p-2 bg-white" value={spec.print.colourCount} onChange={e=>write({...spec,print:{...spec.print,colourCount:e.target.value==="custom"?"custom":Number(e.target.value) as 1|4}})}>{[1,4].map(n=><option key={n} value={n}>{n} {arabic?"ألوان":"colours"}</option>)}<option value="custom">{arabic?"ألوان مخصصة":"Custom colours"}</option></select></label>
  <label className="block text-[11px] space-y-1"><span>{arabic?"مراجع الألوان المخصصة":"Custom colour references"}</span><Input value={spec.print.customColours} maxLength={500} placeholder={arabic?"اسم اللون أو كود مرجعي":"Colour name or reference code"} onChange={e=>write({...spec,print:{...spec.print,customColours:e.target.value}})}/></label>
  <p className="text-[10px] text-slate-500">{arabic?"عدد الألوان مواصفة إنتاج، لا يحول التصميم تلقائيا أو يضمن مطابقة الألوان.":"Colour count is a production specification, not automatic artwork separation or a colour-match guarantee."}</p>
  <p role="status" className="text-[11px] bg-amber-50 border border-amber-200 rounded p-2 text-amber-900">{arabic?"يتطلب عرض سعر. لن يتم استخدام سعر الخامة القديمة لهذه المواصفات.":"Quote required. The legacy material price will not be used for these specifications."}</p>
 </fieldset>
}
