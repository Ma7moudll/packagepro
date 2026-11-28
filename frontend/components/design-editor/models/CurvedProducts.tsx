"use client"
import {useMemo} from "react"
import * as THREE from "three"
import {useProductOpening} from "./useProductOpening"
import type {ProductShapeProps} from "./StockPanel"

import {CupConstruction} from './CupConstruction'

export function CupShape(props:ProductShapeProps&{textures?:Record<string,string>}){return <CupConstruction {...props}/>}

export function TubeShape({dimensions,type,stock,openState=0}:ProductShapeProps){
 const motion=useProductOpening(openState)
 const r=dimensions.width/200,h=dimensions.height/100,b=.005,t=Math.max(0,Math.min(1,motion)),metal=type.replace(/_/g,"-")==="tube-metal-lid"
 const metalMat=useMemo(()=>new THREE.MeshStandardMaterial({color:"#b8b8b8",roughness:.23,metalness:.8}),[])
 const inner=useMemo(()=>{const m=stock.inside.clone();m.side=THREE.BackSide;return m},[stock.inside])
 return <group name="tube-construction">
  {[0,1].map(i=><mesh key={i} position={[0,h/2,0]} rotation={[0,i*Math.PI,0]} material={stock.face(i?"back":"front")} castShadow userData={{faceId:i?"back":"front"}}><cylinderGeometry args={[r,r,h,64,1,true,-Math.PI/2,Math.PI]}/></mesh>)}
  <mesh position={[0,h/2,0]} material={inner}><cylinderGeometry args={[r-b,r-b,h,64,1,true]}/></mesh>
  <mesh position={[0,b/2,0]} rotation={[-Math.PI/2,0,0]} material={stock.inner("bottom")} userData={{faceId:"inside_bottom"}}><circleGeometry args={[r-b,64]}/></mesh>
  <mesh rotation={[Math.PI/2,0,0]} material={stock.face("bottom")} userData={{faceId:"bottom"}}><circleGeometry args={[r,64]}/></mesh>
  <group position={[0,h+t*h*.45,0]}>
   <mesh position={[0,-.02,0]} material={metal?metalMat:stock.outside} castShadow><cylinderGeometry args={[r+b,r+b,.04,64,1,true]}/></mesh>
   <mesh position={[0,.002,0]} rotation={[-Math.PI/2,0,0]} material={metal?metalMat:stock.face("top")} userData={metal?{}:{faceId:"top"}} castShadow><circleGeometry args={[r+b,64]}/></mesh>
   <mesh rotation={[Math.PI/2,0,0]} material={metal?metalMat:stock.inner("top")} userData={metal?{}:{faceId:"inside_top"}}><circleGeometry args={[r+b,64]}/></mesh>
  </group>
 </group>
}

export function PillowShape({dimensions,type,stock}:ProductShapeProps){
 // Batch T24 (T22 list): the erected pillow, following
 // the pillow dieline generator's own convention —
 // length is the finished length between the two end
 // curves, the cross-section is width (vertical,
 // the filled thickness) by height (across the wide
 // face). The body is a parametric tube pinched at
 // both ends: the vertical radius collapses toward
 // each end while the across radius stays full, which
 // is the pillow silhouette; the curved seam profile
 // of the real end folds is approximated by the taper.
 const L=dimensions.length/100,W=dimensions.width/100,H=dimensions.height/100
 const geo=(top:boolean)=>{
  const NX=33,NT=17,pos:number[]=[],uv:number[]=[],idx:number[]=[]
  const pinch=(t:number)=>{const e=.18,s=Math.min(1,Math.min(t,1-t)/e),sm=s*s*(3-2*s);return {y:.04+.96*sm,z:.85+.15*sm}}
  for(let i=0;i<NX;i++){
   const t=i/(NX-1),x=(t-.5)*L,{y:py,z:pz}=pinch(t),ry=(W/2)*py,rz=(H/2)*pz
   for(let j=0;j<NT;j++){
    const th=(j/(NT-1))*Math.PI+(top?0:Math.PI)
    pos.push(x,ry*Math.sin(th),rz*Math.cos(th));uv.push(t,j/(NT-1))
   }
  }
  for(let i=0;i<NX-1;i++)for(let j=0;j<NT-1;j++){const a=i*NT+j,b=a+NT;idx.push(a,b,a+1,b,b+1,a+1)}
  // end fans: close each end ring to its centre point
  const base=pos.length/3
  pos.push(-L/2,0,0,L/2,0,0);uv.push(0,.5,1,.5)
  for(let j=0;j<NT-1;j++){idx.push(base,(0)*NT+j,(0)*NT+j+1);idx.push(base+1,(NX-1)*NT+j+1,(NX-1)*NT+j)}
  const g=new THREE.BufferGeometry()
  g.setAttribute("position",new THREE.Float32BufferAttribute(pos,3))
  g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2))
  g.setIndex(idx);g.computeVertexNormals()
  return g
 }
 const top=useMemo(()=>geo(true),[L,W,H]),bottom=useMemo(()=>geo(false),[L,W,H])
 return <group name="pillow-construction">
  <mesh geometry={top} material={stock.face("front")} castShadow userData={{faceId:"front"}}/>
  <mesh geometry={bottom} material={stock.face("back")} castShadow userData={{faceId:"back"}}/>
 </group>
}

export function StripRollShape({dimensions,stock}:ProductShapeProps){
 // Batch T25: a tape or ribbon roll. The product
 // dimensions carry the strip width (the width field)
 // and the roll length (the length field) — no roll
 // diameter — so the roll is drawn at a display size
 // derived from the strip width: the roll's axial
 // width is the strip width, its radius equals the
 // strip width, and a flat tail of the strip leaves
 // the roll tangentially and lies flat. The roll
 // length is not a shape dimension and is not drawn.
 const w=dimensions.width/100,R=w,core=R*.45,tail=R*2.6
 return <group name="strip-roll-construction">
  <mesh position={[0,R,0]} rotation={[Math.PI/2,0,0]} material={stock.outside} castShadow><cylinderGeometry args={[R,R,w,48,1,true]}/></mesh>
  {[1,-1].map(s=><mesh key={s} position={[0,R,s*w/2]} material={stock.outside} userData={{faceId:s>0?"front":"back"}}><circleGeometry args={[R,48]}/></mesh>)}
  {[1,-1].map(s=><mesh key={"c"+s} position={[0,R,s*(w/2+.001)]} material={stock.inside}><circleGeometry args={[core,32]}/></mesh>)}
  <mesh position={[tail/2-.02,.004,0]} material={stock.face("front")} castShadow userData={{faceId:"front"}}><boxGeometry args={[tail,.008,w]}/></mesh>
 </group>
}
