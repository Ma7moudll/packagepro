"use client"
import {useEffect,useMemo} from "react"
import * as THREE from "three"
import type {ProductShapeProps} from "./StockPanel"
import {createZiplockFilmSurface,createZiplockZipStrip,ZIP_BAND,ZIP_RIDGES} from "@/lib/editor/geometry/ziplock-film"

/** Frosted translucent finish for the film: the stock materials are
 * shared/cache-owned, so the preview always clones before mutating.
 * Translucency and roughness are illustrative optics, not a film spec. */
function frosted(material:THREE.Material,opacity:number){
 const m=material.clone() as THREE.MeshPhysicalMaterial
 m.transparent=true
 m.opacity=opacity
 if(typeof m.roughness==="number")m.roughness=Math.max(m.roughness,.55)
 return m
}

/** Flat frosted ziplock bag: two film sheets sealed at the edges and a
 * raised resealable zip strip near the top. No stand-up gusset, no
 * adhesive flap and no liner — those belong to other products. Artwork
 * maps to the front and back film faces only; the back sheet mirrors U
 * in its UVs so back artwork reads correctly when the bag is turned. */
export function ZiplockBagShape({dimensions,stock}:ProductShapeProps){
 const l=dimensions.length/100,h=dimensions.height/100,w=Math.max(.01,dimensions.width/100)
 const front=useMemo(()=>createZiplockFilmSurface(l,h,w,false),[l,h,w])
 const back=useMemo(()=>createZiplockFilmSurface(l,h,w,true),[l,h,w])
 const bandCenter=(ZIP_BAND.v0+ZIP_BAND.v1)/2,bandHalf=(ZIP_BAND.v1-ZIP_BAND.v0)/2
 const strips=useMemo(()=>[
  ...ZIP_RIDGES.flatMap(v=>[createZiplockZipStrip(l,h,w,v,.007,.0013,false),createZiplockZipStrip(l,h,w,v,.007,.0013,true)]),
  createZiplockZipStrip(l,h,w,bandCenter,bandHalf,.0005,false),
  createZiplockZipStrip(l,h,w,bandCenter,bandHalf,.0005,true),
 ],[l,h,w,bandCenter,bandHalf])
 const rawFront=stock.face("front"),rawBack=stock.face("back")
 const frontMat=useMemo(()=>frosted(rawFront,.87),[rawFront])
 const backMat=useMemo(()=>frosted(rawBack,.87),[rawBack])
 const zipMat=useMemo(()=>frosted(stock.outside,.72),[stock.outside])
 useEffect(()=>()=>{front.dispose();back.dispose()},[front,back])
 useEffect(()=>()=>{for(const s of strips)s.dispose()},[strips])
 useEffect(()=>()=>frontMat.dispose(),[frontMat])
 useEffect(()=>()=>backMat.dispose(),[backMat])
 useEffect(()=>()=>zipMat.dispose(),[zipMat])
 return <group name="frosted-ziplock-construction">
  <mesh geometry={front} material={frontMat} castShadow userData={{faceId:"front"}}/>
  <mesh geometry={back} material={backMat} castShadow userData={{faceId:"back"}}/>
  {strips.map((s,i)=><mesh key={i} geometry={s} material={zipMat}/>)}
 </group>
}
