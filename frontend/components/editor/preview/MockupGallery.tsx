"use client"

import {useEffect, useState} from "react"
import {useDesignStore} from "@/lib/editor/state/store"
import {useLanguage} from "@/providers/language-provider"
import {captureLiveScene, sceneRevision, type SceneImage} from "@/lib/editor/services/scene-capture"
import {Button} from "@/components/ui/button"
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import {Camera} from "lucide-react"

export function MockupGallery({open:controlledOpen,onOpenChange,hideTrigger=false}:{open?:boolean;onOpenChange?:(open:boolean)=>void;hideTrigger?:boolean}={}) {
  const {language}=useLanguage()
  const ar=language==="ar"
  const [internalOpen,setInternalOpen]=useState(false)
  const open=controlledOpen??internalOpen
  const setOpen=(value:boolean)=>{setInternalOpen(value);onOpenChange?.(value)}
  const model=useDesignStore(s=>s.model), layers=useDesignStore(s=>s.layers), canvas=useDesignStore(s=>s.canvas), boxOpen=useDesignStore(s=>s.ui.boxOpenState)
  const revision=sceneRevision(model,layers,canvas,boxOpen)
  const [image,setImage]=useState<SceneImage|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState("")
  const stale=!!image&&image.revision!==revision
  useEffect(()=>()=>{if(image)URL.revokeObjectURL(image.url)},[image])
  async function capture() {
    setBusy(true);setError("");setImage(null)
    try {setImage(await captureLiveScene())}
    catch (error) {console.warn("Scene capture failed",error);setError(ar?"تعذر التقاط المشهد الحالي. افتح العرض ثلاثي الأبعاد للصندوق البريدي وانتظر تحميل التصميم وتوقف حركة الغطاء والكاميرا. الصور المفقودة أو المؤثرات غير المدعومة تمنع الالتقاط.":"Could not capture the current scene. Open the mailer 3D view and wait for the artwork, lid and camera to settle. Missing images or unsupported effects block capture.")}
    finally {setBusy(false)}
  }
  function download() {
    if(!image||stale||busy)return
    const link=document.createElement("a");link.href=image.url;link.download=`packagepro-scene-rgb-${image.width}x${image.height}.png`;link.click()
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    {!hideTrigger&&<DialogTrigger asChild><Button variant="outline" size="sm"><Camera className="h-4 w-4 mr-2"/>{ar?"معاينة Mockup":"Mockup Preview"}</Button></DialogTrigger>}
    <DialogContent className="w-[calc(100%-2rem)] sm:max-w-4xl max-h-[85vh] flex flex-col p-4 sm:p-6 [&>button[data-slot=dialog-close]]:left-3 [&>button[data-slot=dialog-close]]:right-auto [&>button[data-slot=dialog-close]]:top-3 [&>button[data-slot=dialog-close]]:h-8 [&>button[data-slot=dialog-close]]:w-8 [&>button[data-slot=dialog-close]]:flex [&>button[data-slot=dialog-close]]:items-center [&>button[data-slot=dialog-close]]:justify-center">
      <DialogHeader className="shrink-0"><DialogTitle className="px-10 min-h-8 leading-6">{ar?"لقطة المشهد ثلاثي الأبعاد":"3D scene capture"}</DialogTitle></DialogHeader>
      <div data-scene-body className="overflow-y-auto min-h-0 space-y-4">
        <p role="status" className="text-sm text-slate-600">{ar?"لقطة RGB محلية للعرض الحالي للصندوق البريدي، بخامته وتصميمه وإضاءته وخلفيته الرمادية الحالية. ليست ملف طباعة أو محاكاة معتمدة للخامة. المنتجات الأخرى غير مدعومة حاليًا.":"Local RGB snapshot of the current mailer view, including its material, artwork, lighting and current gray background. Not a print file or a certified material simulation. Other products are not supported yet."}</p>
        {image&&<><img data-scene-preview src={image.url} alt={ar?"لقطة فعلية للمشهد الحالي":"Captured current 3D scene"} className="w-full max-h-[45vh] object-contain rounded border bg-slate-50"/><p className="text-xs text-slate-500">{image.width} × {image.height} px. {ar?"نفس دقة مساحة العرض الحالية، دون تكبير مصطنع.":"Current viewport render size, no artificial upscaling."}</p></>}
        {stale&&<p role="alert">{ar?"تغير التصميم. التقط صورة جديدة قبل التنزيل.":"The design changed. Capture again before downloading."}</p>}
        {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2"><Button onClick={capture} disabled={busy}>{busy?(ar?"جارٍ الالتقاط...":"Capturing..."):(ar?"التقاط العرض الحالي":"Capture current view")}</Button><Button variant="outline" onClick={download} disabled={!image||stale||busy}>{ar?"تنزيل PNG للمشهد":"Download scene PNG"}</Button></div>
      </div>
    </DialogContent>
  </Dialog>
}
