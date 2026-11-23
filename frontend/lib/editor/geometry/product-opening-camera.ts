import type {PreviewFamily} from '../product-preview-coverage'
export interface OpeningFraming {scale:number;lift:number}

/** Preview camera allowance, not a product dimension or production rule.
 * A film flap does not need the same framing as a tall carton lid. */
export function productOpeningFraming(family:PreviewFamily|undefined,dimensions:{length:number;width:number;height:number},open:number):OpeningFraming{
 const t=Math.max(0,Math.min(1,Number.isFinite(open)?open:0))
 const safe=(n:number)=>Number.isFinite(n)?Math.max(0,n)/100:0
 const l=safe(dimensions.length),w=safe(dimensions.width),h=safe(dimensions.height)
 if(family==='mailer')return {scale:1+.55*t,lift:h*.3*t}
 const extra=family==='shipping'?w*.5:family==='rigid'?h*.85:family==='carton'?w+Math.min(h*.3,w*.45):family==='pizza'?w+h*.28:family==='tube'?h*.45:family==='envelope'?h*.25:0
 return {scale:1+.65*extra/Math.max(.01,l,w,h)*t,lift:extra*.45*t}
}

/** Reframe around the orbit target. A user's pan/zoom is retained, not reset. */
export function reframeOpeningCamera(position:readonly number[],target:readonly number[],previous:OpeningFraming,next:OpeningFraming){
 const ratio=next.scale/previous.scale
 const nextTarget:[number,number,number]=[target[0],target[1]+next.lift-previous.lift,target[2]]
 const nextPosition:[number,number,number]=[0,1,2].map(i=>nextTarget[i]+(position[i]-target[i])*ratio) as [number,number,number]
 return {position:nextPosition,target:nextTarget}
}

/** Menu sheets are centered on Y=0; other existing constructions retain their grounded target. */
export function productCameraTargetHeight(type:string|undefined,height:number){return type?.replace(/-/g,'_')==='menu_card'?0:height/200}
