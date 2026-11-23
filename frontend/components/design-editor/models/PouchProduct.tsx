"use client"
import {useEffect,useMemo} from "react"
import * as THREE from "three"
import type {ProductShapeProps} from "./StockPanel"
import {createPouchSurface} from "@/lib/editor/geometry/pouch-preview"

export function PouchShape({dimensions,type,stock}:ProductShapeProps){
 const l=dimensions.length/100,h=dimensions.height/100,w=dimensions.width/100
 const front=useMemo(()=>createPouchSurface(l,h,w),[l,h,w]),back=useMemo(()=>createPouchSurface(l,h,w,true),[l,h,w])
 const seam=useMemo(()=>new THREE.MeshStandardMaterial({color:"#d0c7b5",roughness:.6}),[])
 useEffect(()=>()=>{front.dispose();back.dispose()},[front,back])
 return <group name="stand-up-pouch-construction">
  <mesh geometry={front} material={stock.face("front")} userData={{faceId:"front"}} castShadow/>
  <mesh geometry={back} material={stock.face("back")} userData={{faceId:"back"}} castShadow/>
  {/* Two sealed rails and a top zipper; no imaginary mailer-box lid. */}
  {[-1,1].map(side=><mesh key={side} position={[side*l*.49,h*.45,0]} material={seam}><boxGeometry args={[.012,h*.9,.004]}/></mesh>)}
  <mesh position={[0,h*.92,.006]} material={seam}><boxGeometry args={[l*.93,.012,.006]}/></mesh>
  <mesh position={[0,h*.08,0]} rotation={[-Math.PI/2,0,0]} scale={[l*.4,w*.1,1]} material={stock.outside}><circleGeometry args={[1,48]}/></mesh>
  {type.replace(/_/g,"-")==="doypack-valve"&&<group position={[l*.22,h*.68,w*.5*Math.sin(Math.PI*.72)*Math.sin(Math.PI*.68)+.006]}>
   <mesh><circleGeometry args={[.036,24]}/><meshStandardMaterial color="#ece4d3" roughness={.8}/></mesh>
   <mesh position={[0,0,.001]}><circleGeometry args={[.008,16]}/><meshStandardMaterial color="#776e60" roughness={.8}/></mesh>
  </group>}
 </group>
}
