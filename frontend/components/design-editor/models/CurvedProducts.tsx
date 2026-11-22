"use client"
import {useMemo} from "react"
import * as THREE from "three"
import {useProductOpening} from "./useProductOpening"
import type {ProductShapeProps} from "./StockPanel"

/** Cylindrical artwork uses separate front/back half-wraps. This is a preview,
 * not a conical/cylindrical production unroll or food-contact certification. */
export function CupShape({dimensions,type,stock}:ProductShapeProps){
 const top=dimensions.width/200,bottom=dimensions.length/200,h=dimensions.height/100,b=.003
 const clear=type.replace(/_/g,"-")==="smoothie-cup"
 const body=useMemo(()=>{const m=stock.outside.clone();if(clear){m.transparent=true;m.opacity=.28;m.roughness=.12;m.clearcoat=1;m.depthWrite=false}return m},[stock.outside,clear])
 const innerFront=useMemo(()=>{const m=stock.inner("front").clone();m.side=THREE.BackSide;return m},[stock])
 const innerBack=useMemo(()=>{const m=stock.inner("back").clone();m.side=THREE.BackSide;return m},[stock])
 return <group name="cup-construction">
  {[0,1].map(i=><group key={i} rotation={[0,i*Math.PI,0]}>
   <mesh position={[0,h/2,0]} material={clear?body:stock.face(i?"back":"front")} castShadow userData={{faceId:i?"back":"front"}}><cylinderGeometry args={[top,bottom,h,48,1,true,-Math.PI/2,Math.PI]}/></mesh>
   {!clear&&<mesh position={[0,h/2,0]} material={i?innerBack:innerFront} userData={{faceId:i?"inside_back":"inside_front"}}><cylinderGeometry args={[Math.max(.001,top-b),Math.max(.001,bottom-b),h-b,48,1,true,-Math.PI/2,Math.PI]}/></mesh>}
  </group>)}
  <mesh position={[0,b/2,0]} rotation={[-Math.PI/2,0,0]} material={stock.inner("bottom")} userData={{faceId:"inside_bottom"}}><circleGeometry args={[bottom-b,48]}/></mesh>
  <mesh position={[0,0,0]} rotation={[Math.PI/2,0,0]} material={stock.face("bottom")} userData={{faceId:"bottom"}}><circleGeometry args={[bottom,48]}/></mesh>
  <mesh position={[0,h,0]} rotation={[-Math.PI/2,0,0]} material={body}><torusGeometry args={[top,.006,10,64]}/></mesh>
 </group>
}

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
