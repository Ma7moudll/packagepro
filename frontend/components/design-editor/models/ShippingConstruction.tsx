'use client'
import {useEffect,useMemo} from 'react'
import type {ProductStock} from './StockPanel'
import {StockPanel} from './StockPanel'
import {CorrugatedPanel} from './CorrugatedPanel'
import {useProductOpening} from './useProductOpening'
import type {BoxDimensions} from './BoxModels'

const ease=(x:number)=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2
/** Illustrative RSC construction, not an approved caliper, seam or cutting file.
 * Continuous liner/core panels replace solid, sub-millimetre-looking sheets. */
export function ShippingConstruction({dimensions,stock,openState=0}:{dimensions:BoxDimensions;stock:ProductStock;openState?:number}){
 const progress=useProductOpening(openState),t=ease(progress)
 const l=dimensions.length/100,w=dimensions.width/100,h=dimensions.height/100
 const b=Math.min(.028,l/45,w/35,h/28),d=Math.max(b,w/2-b*.65),minorDepth=Math.min(d,l/2-b)
 const minor=ease(Math.min(1,t*1.6))*Math.PI*.64,major=ease(Math.max(0,t-.15)/.85)*Math.PI*.64
 const p={thickness:b,stock},gap=b*.55
 const score=useMemo(()=>{const m=stock.edge.clone();m.color.multiplyScalar(.86);return m},[stock.edge])
 useEffect(()=>()=>score.dispose(),[score])
 return <group name="shipping-construction">
  <CorrugatedPanel {...p} width={l} height={h} faceId="front" position={[0,h/2,w/2-b/2]}/>
  <CorrugatedPanel {...p} width={l} height={h} faceId="back" position={[0,h/2,-w/2+b/2]} rotation={[0,Math.PI,0]}/>
  <CorrugatedPanel {...p} width={w-b*2} height={h} faceId="left" position={[-l/2+b/2,h/2,0]} rotation={[0,-Math.PI/2,0]}/>
  <CorrugatedPanel {...p} width={w-b*2} height={h} faceId="right" position={[l/2-b/2,h/2,0]} rotation={[0,Math.PI/2,0]}/>

  {/* Folded bottom: outer long flaps meet; short flaps lie inside them. */}
  {[-1,1].map(side=><CorrugatedPanel key={`bottom-major-${side}`} {...p} width={l-gap} height={d} faceId="bottom" uvRect={side===1?[0,.5,1,1]:[0,0,1,.5]} position={[0,b/2,side*(w/2-b/2-d/2)]} rotation={[Math.PI/2,0,0]}/>)}
  {[-1,1].map(side=><CorrugatedPanel key={`bottom-minor-${side}`} {...p} width={minorDepth} height={w-b*2-gap} fluteAxis="x" position={[side*(l/2-b/2-minorDepth/2),b*1.52,0]} rotation={[Math.PI/2,0,0]}/>)}

  {/* Narrow inside manufacturer's joint, kept off the printed face picker. */}
  <StockPanel width={Math.min(l*.065,h*.16)} height={h-b*3} thickness={b*.72} outside={stock.inside} inside={stock.inside} edge={stock.edge} position={[-l/2+Math.min(l*.065,h*.16)/2+b,h/2,-w/2+b*1.36]}/>

  {[-1,1].map(side=><group key={`top-minor-${side}`} position={[side*(l/2-b/2),h-b,0]} rotation={[0,0,-side*minor]}>
   <CorrugatedPanel {...p} width={minorDepth} height={w-b*2-gap} fluteAxis="x" position={[-side*minorDepth/2,0,0]} rotation={[-Math.PI/2,0,0]}/>
  </group>)}
  {[-1,1].map(side=><group key={`top-major-${side}`} name={`shipping-major-${side}`} position={[0,h,side*(w/2-b/2)]} rotation={[side*major,0,0]}>
   <CorrugatedPanel {...p} width={l-gap} height={d} faceId="top" uvRect={side===1?[0,0,1,.5]:[0,.5,1,1]} position={[0,0,-side*d/2]} rotation={[-Math.PI/2,0,0]}/>
   {/* Thin compressed paper at the fold, rather than a metal-looking hinge. */}
   <mesh position={[0,-b*.17,0]} material={score}><boxGeometry args={[l-gap,b*.2,b*.5]}/></mesh>
  </group>)}
 </group>
}
