"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/providers/language-provider"
import { useDesignStore } from "@/lib/editor/state/store"
import { serializeDesignData } from "@/lib/editor/services/dieline-manifest"
import { ensureCloudSession } from "@/lib/editor/services/storage"
import { designsApi } from "@/lib/api/designs"
import { assertReviewInput, reviewSnapshot, reviewHash, renderArtworkReview, blobBase64, downloadStoredReview } from "@/lib/editor/services/artwork-review"

export function ArtworkReviewDownload({designId,fileId}:{designId?:string;fileId?:string}) {
  const {language}=useLanguage()
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState("")
  const [failed,setFailed]=useState(false)
  const t=(en:string,ar:string)=>language==="ar"?ar:en
  const handle=async()=>{
    setBusy(true);setMessage("");setFailed(false)
    try {
      if (designId && fileId) {
        const response=await designsApi.getArtworkReview(designId,fileId)
        if (!response.success || !response.data) throw new Error("Stored review unavailable")
        await downloadStoredReview(response.data)
      } else {
        const store=useDesignStore.getState()
        const captured=serializeDesignData(structuredClone(store.history.present))
        assertReviewInput(captured)
        const expected=await reviewHash(reviewSnapshot(captured))
        const sid=await ensureCloudSession(store.sessionId??null,"F42 artwork review",structuredClone(store.history.present))
        useDesignStore.setState({sessionId:sid})
        sessionStorage.setItem("designSessionId",sid)
        const session=await designsApi.getSession(sid)
        const saved=(session as any).data
        if (!saved?.designId || !saved.designData || await reviewHash(reviewSnapshot(saved.designData))!==expected) throw new Error("Saved artwork changed. Save and try again.")
        const rendered=await renderArtworkReview(saved.designData)
        const stillCurrent=async()=>await reviewHash(reviewSnapshot(serializeDesignData(useDesignStore.getState().history.present)))===expected
        if (!await stillCurrent()) throw new Error("Artwork changed during export. Create a new review.")
        const created=await designsApi.createArtworkReview(saved.designId,{snapshotHash:rendered.snapshotHash,pdfBase64:await blobBase64(rendered.blob)})
        if (!created.success || !created.data) throw new Error("Review could not be stored")
        const stored=await designsApi.getArtworkReview(saved.designId,created.data.id)
        if (!stored.success || !stored.data || stored.data.snapshotHash!==expected || !await stillCurrent()) throw new Error("Review is stale. Save and create a new review.")
        await downloadStoredReview(stored.data)
        useDesignStore.getState().setDesignId(saved.designId)
        const url=new URL(window.location.href);url.searchParams.set("sessionId",sid);window.history.replaceState(null,"",url)
      }
      setMessage(t("Downloaded the saved RGB review PDF. Not for production.","تم تنزيل ملف المراجعة المحفوظ RGB. غير مخصص للإنتاج."))
    } catch(error) {setFailed(true);setMessage(error instanceof Error?error.message:"Review PDF unavailable")}
    finally {setBusy(false)}
  }
  return <div className="space-y-2" data-artwork-review>
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={handle} data-artwork-review-download>
      {busy?t("Preparing saved review...","جارٍ تجهيز المراجعة المحفوظة..."):fileId?t("Download saved review PDF","تنزيل PDF المراجعة المحفوظ"):t("Save & download F42 review PDF","حفظ وتنزيل PDF مراجعة F42")}
    </Button>
    {!fileId && <p className="text-xs text-muted-foreground">{t("F42 115 x 70 x 38 mm, outside only. Registered artwork + canonical guides. RGB review only, no production bleed or certification.","F42 بأبعاد 115 × 70 × 38 مم، الوجه الخارجي فقط. التصميم ومحاذاة المخطط في ملف RGB للمراجعة فقط، دون نزيف طباعي أو اعتماد إنتاجي.")}</p>}
    {message && <p role={failed?"alert":"status"} className={failed?"text-xs text-red-700":"text-xs text-slate-600"}>{message}</p>}
  </div>
}
