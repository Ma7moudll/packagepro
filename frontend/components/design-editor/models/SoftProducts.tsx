"use client"
import {useMemo,useEffect} from "react"
import * as THREE from "three"
import {createMailerFilmSurface,createMailerFlap,createMailerReleaseLiner} from "@/lib/editor/geometry/mailer-film"
import {StockPanel,type ProductShapeProps} from "./StockPanel"

/** Open rectangular paper carrier with real depth and separate inner lining.
 * Textile constructions and their handles require separate models. */
export function PaperBagShape({dimensions,stock}:ProductShapeProps){
 const l=dimensions.length/100,w=dimensions.width/100,h=dimensions.height/100,b=.002,p={thickness:b,edge:stock.edge},fold=Math.min(l*.06,w*.18),half=Math.hypot(w/2,fold),angle=Math.atan2(fold,w/2)
 return <group name="paper-bag-construction">
  <StockPanel {...p} width={l} height={h} outside={stock.face("front")} inside={stock.inner("front")} faceId="front" position={[0,h/2,w/2]}/>
  <StockPanel {...p} width={l} height={h} outside={stock.face("back")} inside={stock.inner("back")} faceId="back" position={[0,h/2,-w/2]} rotation={[0,Math.PI,0]}/>
  {/* Each side has two inward-folded gusset leaves, not a rigid box wall. */}
  {[-1,1].flatMap(side=>[-1,1].map(front=><StockPanel key={`${side}-${front}`} {...p} width={half} height={h} outside={stock.face(side===1?"right":"left")} inside={stock.inner(side===1?"right":"left")} faceId={side===1?"right":"left"} uvRect={front===1?[.5,0,1,1]:[0,0,.5,1]} position={[side*(l/2-fold/2),h/2,front*w/4]} rotation={[0,side*Math.PI/2+side*front*angle,0]}/>))}
  <StockPanel {...p} width={l} height={w} outside={stock.face("bottom")} inside={stock.inner("bottom")} faceId="bottom" position={[0,b,0]} rotation={[Math.PI/2,0,0]}/>
  {[-1,1].map(side=><group key={side} position={[0,h,side*w/2]}>
   <mesh position={[0,l*.08,0]} material={stock.outside}><torusGeometry args={[l*.19,.007,10,36,Math.PI]}/></mesh>
   {[-1,1].map(x=><mesh key={x} position={[x*l*.19,l*.04,0]} material={stock.outside}><cylinderGeometry args={[.007,.007,l*.08,10]}/></mesh>)}
  </group>)}
 </group>
}

export function EnvelopeShape({dimensions,stock,openState=0}:ProductShapeProps){
 const l=dimensions.length/100,h=dimensions.height/100,w=Math.max(.012,dimensions.width/100),b=.002,t=Math.max(0,Math.min(1,openState)),p={thickness:b,edge:stock.edge}
 return <group name="envelope-construction">
  <StockPanel {...p} width={l} height={h*.78} outside={stock.face("front")} inside={stock.inner("front")} faceId="front" position={[0,h*.39,w/2]}/>
  <StockPanel {...p} width={l} height={h*.78} outside={stock.face("back")} inside={stock.inner("back")} faceId="back" position={[0,h*.39,-w/2]} rotation={[0,Math.PI,0]}/>
  {[-1,1].map(side=><StockPanel key={side} {...p} width={w} height={h*.78} outside={stock.outside} inside={stock.inside} position={[side*l/2,h*.39,0]} rotation={[0,side*Math.PI/2,0]}/>)}
  <StockPanel {...p} width={l} height={w} outside={stock.outside} inside={stock.inside} position={[0,b,0]} rotation={[Math.PI/2,0,0]}/>
  <group position={[0,h*.78,w/2+b]} rotation={[-(1-t)*Math.PI,0,0]}>
   <StockPanel {...p} width={l} height={h*.25} outside={stock.outside} inside={stock.inside} position={[0,h*.125,0]} rotation={[0,Math.PI,0]}/>
  </group>
 </group>
}

/** Front/back soft-film mailer. Material choice is illustrative; no paperboard
 * liner is silently used as proof of film/barrier suitability. */
export function MailerBagShape({dimensions,stock,type,openState=0}:ProductShapeProps){
 const l=dimensions.length/100,h=dimensions.height/100,w=Math.max(.008,dimensions.width/100),paper=type.replace(/_/g,'-')==='paper-mailer-bag'
 const t=Math.max(0,Math.min(1,openState))
 const front=useMemo(()=>createMailerFilmSurface(l,h,w,false,t,paper),[l,h,w,t,paper])
 const back=useMemo(()=>createMailerFilmSurface(l,h,w,true,t,paper),[l,h,w,t,paper])
 const flap=useMemo(()=>createMailerFlap(l,h,w,t),[l,h,w,t])
 const liner=useMemo(()=>createMailerReleaseLiner(l,h,w,t),[l,h,w,t])
 const linerMaterial=useMemo(()=>new THREE.MeshStandardMaterial({color:'#c7c5bd',roughness:.8}),[])
 const reverseOutside=useMemo(()=>{const m=stock.outside.clone();m.side=THREE.BackSide;return m},[stock.outside])
 const inside=useMemo(()=>{const m=stock.inside.clone();m.side=THREE.BackSide;return m},[stock.inside])
 useEffect(()=>()=>{front.dispose();back.dispose();flap.dispose();liner.dispose()},[front,back,flap,liner])
 useEffect(()=>()=>inside.dispose(),[inside])
 useEffect(()=>()=>reverseOutside.dispose(),[reverseOutside])
 useEffect(()=>()=>linerMaterial.dispose(),[linerMaterial])
 return <group name="mailer-bag-construction">
  {/* Two flexible sheets converge at sealed side/bottom edges. There are no
      rigid box sidewalls, a stand-up gusset or an invented cardboard rim. */}
  <mesh geometry={front} material={stock.face('front')} castShadow userData={{faceId:'front'}}/>
  <mesh geometry={back} material={stock.face('back')} castShadow userData={{faceId:'back'}}/>
  <mesh geometry={front} material={inside} userData={{faceId:'inside_front'}}/>
  <mesh geometry={back} material={inside} userData={{faceId:'inside_back'}}/>
  <mesh geometry={flap} material={stock.inside} castShadow/>
  <mesh geometry={flap} material={reverseOutside}/>
  <mesh geometry={liner} material={linerMaterial}/>
 </group>
}
