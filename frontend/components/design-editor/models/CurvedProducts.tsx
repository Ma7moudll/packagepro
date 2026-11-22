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
