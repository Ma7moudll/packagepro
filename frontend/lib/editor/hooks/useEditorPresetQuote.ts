'use client'
import {useEffect, useState} from 'react'
import {catalogApi} from '../../api/catalog'
import {useDesignStore} from '../state/store'
import {editorRequiresQuote} from '../quote-policy'
import {normalizePresetQuote, preparePresetQuote, PresetQuoteRequired, type EditorPresetQuote} from '../preset-catalog-quote'
import type {DesignCoreState} from '../state/types'

// Coalesce only concurrent reads. No persistent catalog/rate cache.
const inFlight = new Map<string, Promise<any>>()
function together<T>(key:string, run:()=>Promise<T>):Promise<T>{
 const found=inFlight.get(key);if(found)return found
 const pending=run();inFlight.set(key,pending)
 pending.then(()=>inFlight.delete(key),()=>inFlight.delete(key));return pending
}
export async function requestEditorPresetQuote(core:DesignCoreState,quantity:number):Promise<EditorPresetQuote>{
 if(editorRequiresQuote(core)||!core.product||!core.productConfig?.variantId)throw new PresetQuoteRequired('Quote required')
 const detail=await together('detail:'+core.product.slug,()=>catalogApi.detail(core.product!.slug))
 if(!detail.success||!detail.data)throw new Error('Price unavailable')
 const prepared=preparePresetQuote(core,detail.data,quantity)
 const response=await together('quote:'+prepared.slug+':'+JSON.stringify(prepared.body),()=>catalogApi.quote(prepared.slug,prepared.body))
 if(!response.success||!response.data)throw new Error('Price unavailable')
 return normalizePresetQuote(prepared,response.data)
}
export function useEditorPresetQuote(quantityOverride?:number){
 const core=useDesignStore(s=>s.history.present)
 const quantity=quantityOverride??core.model.quantity
 const [retryCount,setRetryCount]=useState(0)
 const blocked=editorRequiresQuote(core)
 const key=JSON.stringify({model:core.model,product:core.product,config:core.productConfig,blocked,quantity,retryCount})
 const [result,setResult]=useState<{key:string;quote:EditorPresetQuote|null;status:'ready'|'unpriced'|'error';error?:string}|null>(null)
 useEffect(()=>{
  let cancelled=false
  if(blocked){setResult({key,quote:null,status:'unpriced'});return}
  const timer=setTimeout(()=>{
   requestEditorPresetQuote(core,quantity).then(quote=>{if(!cancelled)setResult({key,quote,status:'ready'})})
    .catch(error=>{if(!cancelled)setResult({key,quote:null,status:error instanceof PresetQuoteRequired?'unpriced':'error',error:error.message})})
  },250)
  return()=>{cancelled=true;clearTimeout(timer)}
 },[key]) // The key deliberately excludes selection/camera/artwork-only changes.
 const current=result?.key===key?result:null
 return {core,key,quote:current?.quote??null,status:blocked?'unpriced' as const:current?.status??'loading' as const,error:current?.error,retry:()=>setRetryCount(n=>n+1)}
}
