"use client"
import {useMemo,useEffect} from 'react'
import * as THREE from 'three'
import {carrierHandleCurve,createCarrierRibbon} from '@/lib/editor/geometry/carrier-handle'
import type {ProductStock} from './StockPanel'
/** Illustrative attachment and proportions, not a handle strength/gauge spec. */
export function CarrierHandle({width,height,style,stock}:{width:number;height:number;style:'twisted_paper'|'cotton_ropes'|'ribbon';stock:ProductStock}){
 const parts=useMemo(()=>{
  const radius=Math.min(width*.008,.018),curve=carrierHandleCurve(width,height)
  const body=style==='ribbon'?createCarrierRibbon(width,height):new THREE.TubeGeometry(curve,96,radius,12,false)
  const material=stock.outside.clone();material.roughness=style==='ribbon'?.55:.92;if(style==='ribbon')material.side=THREE.DoubleSide
  if(style==='cotton_ropes'){material.map=null;material.color.set('#ded8c8')}
  const ridgeMaterial=material.clone();ridgeMaterial.color.multiplyScalar(1.04)
  const frames=curve.computeFrenetFrames(240,false),points:THREE.Vector3[]=[]
  for(let i=0;i<=240;i++){const t=i/240,p=curve.getPoint(t),angle=t*Math.PI*48;points.push(p.addScaledVector(frames.normals[i],Math.cos(angle)*radius*.7).addScaledVector(frames.binormals[i],Math.sin(angle)*radius*.7))}
  const ridge=style==='twisted_paper'?new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),320,radius*.22,5,false):undefined
  return {body,material,ridge,ridgeMaterial}
 },[width,height,style,stock.outside])
 useEffect(()=>()=>{parts.body.dispose();parts.ridge?.dispose();parts.material.dispose();parts.ridgeMaterial.dispose()},[parts])
 return <group name={`carrier-handle-${style}`}><mesh geometry={parts.body} material={parts.material} castShadow/>{parts.ridge&&<mesh geometry={parts.ridge} material={parts.ridgeMaterial}/>}</group>
}
