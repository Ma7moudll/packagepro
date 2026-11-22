"use client"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { createMailerPanel } from "@/lib/editor/geometry/mailer-construction"

export interface ProductStock {
 outside:THREE.MeshPhysicalMaterial;inside:THREE.MeshPhysicalMaterial;edge:THREE.MeshStandardMaterial;
 face:(id:string)=>THREE.MeshStandardMaterial;inner:(id:string)=>THREE.MeshStandardMaterial;
}
export interface ProductShapeProps {
 carrierHandle?:"none"|"twisted_paper"|"cotton_ropes"|"ribbon";
 dimensions:{length:number;width:number;height:number};openState?:number;type:string;stock:ProductStock;material?:string
}

/** Generic flat stock panel. Geometry is a preview, never a production dieline.
 * +Z outside, -Z inside. Cut edges cannot receive ink or face selection. */
export function StockPanel({width,height,thickness,outside,inside,edge,faceId,insideFaceId,position=[0,0,0],rotation=[0,0,0],uvRect=[0,0,1,1]}:{
 width:number;height:number;thickness:number;outside:THREE.Material;inside:THREE.Material;edge:THREE.Material;
 faceId?:string;insideFaceId?:string;position?:[number,number,number];rotation?:[number,number,number];uvRect?:[number,number,number,number]
}){
 const [u0,v0,u1,v1]=uvRect
 const geometry=useMemo(()=>{
  const g=createMailerPanel(width,height,thickness,"rounded",Math.min(thickness*.2,.002))
  const uv=g.getAttribute("uv"),n=g.getAttribute("normal")
  for(let i=0;i<uv.count;i++)if(Math.abs(n.getZ(i))>.99)uv.setXY(i,u0+uv.getX(i)*(u1-u0),v0+uv.getY(i)*(v1-v0))
  uv.needsUpdate=true
  return g
 },[width,height,thickness,u0,v0,u1,v1])
 useEffect(()=>()=>geometry.dispose(),[geometry])
 return <mesh geometry={geometry} material={[outside,inside,edge]} position={position} rotation={rotation} castShadow receiveShadow userData={faceId?{faceId,insideFaceId:insideFaceId??`inside_${faceId}`}:{}}/>
}
