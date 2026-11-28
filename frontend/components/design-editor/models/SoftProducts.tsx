"use client"
import {useMemo,useEffect} from "react"
import * as THREE from "three"
import {createMailerFilmSurface,createMailerFlap,createMailerReleaseLiner} from "@/lib/editor/geometry/mailer-film"
import {useProductOpening} from "./useProductOpening"
import {PaperCarrier} from "./PaperCarrier"
import {StockPanel,type ProductShapeProps} from "./StockPanel"

/** Open rectangular paper carrier with real depth and separate inner lining.
 * Textile constructions and their handles require separate models. */
export function PaperBagShape(props:ProductShapeProps){return <PaperCarrier {...props}/>}

export function EnvelopeShape({dimensions,stock,openState=0}:ProductShapeProps){
 const motion=useProductOpening(openState)
 const l=dimensions.length/100,h=dimensions.height/100,w=Math.max(.012,dimensions.width/100),b=.002,t=Math.max(0,Math.min(1,motion)),p={thickness:b,edge:stock.edge}
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
 const motion=useProductOpening(openState)
 const l=dimensions.length/100,h=dimensions.height/100,w=Math.max(.008,dimensions.width/100),paper=type.replace(/_/g,'-')==='paper-mailer-bag'
 const t=Math.max(0,Math.min(1,motion))
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

export function SewnBagShape({dimensions,stock}:ProductShapeProps){
 // Batch T25: an open-top sewn textile bag. The body
 // is a parametric tube with an elliptical cross
 // section (length across, width as the gusset
 // depth), closed at the bottom and open at the top,
 // with a slightly wider hem band at the top edge.
 // Plain tote form — no handles, drawstring or
 // printed construction details are modelled.
 const L=dimensions.length/100,W=dimensions.width/100,H=dimensions.height/100
 const half=(top:boolean,hem:boolean)=>{
  const NY=hem?2:9,NT=17,pos:number[]=[],uv:number[]=[],idx:number[]=[]
  for(let i=0;i<NY;i++){
   const t=hem?.92+i*.08:i/(NY-1),y=t*H,bulge=hem?1.03:1+Math.sin(t*Math.PI)*.03
   const rx=(L/2)*bulge,rz=(W/2)*bulge
   for(let j=0;j<NT;j++){
    const th=(j/(NT-1))*Math.PI+(top?0:Math.PI)
    pos.push(rx*Math.cos(th),y,rz*Math.sin(th));uv.push(j/(NT-1),t)
   }
  }
  for(let i=0;i<NY-1;i++)for(let j=0;j<NT-1;j++){const a=i*NT+j,b=a+NT;idx.push(a,a+1,b,b,a+1,b+1)}
  if(!hem){const base=pos.length/3;pos.push(0,0,0);uv.push(.5,0);for(let j=0;j<NT-1;j++)idx.push(base,(0)*NT+j+1,(0)*NT+j)}
  const g=new THREE.BufferGeometry()
  g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3))
  g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2))
  g.setIndex(idx);g.computeVertexNormals()
  return g
 }
 const front=useMemo(()=>half(true,false),[L,W,H]),back=useMemo(()=>half(false,false),[L,W,H]),hem=useMemo(()=>half(true,true),[L,W,H])
 return <group name="sewnbag-construction">
  <mesh geometry={front} material={stock.face("front")} castShadow userData={{faceId:"front"}}/>
  <mesh geometry={back} material={stock.face("back")} castShadow userData={{faceId:"back"}}/>
  <mesh geometry={hem} material={stock.inside}/>
 </group>
}
