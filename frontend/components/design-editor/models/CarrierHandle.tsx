"use client"
import {useMemo,useEffect} from 'react'
import * as THREE from 'three'
import {carrierHandleCurve,createCarrierRibbon,createCarrierRibbonKnot} from '@/lib/editor/geometry/carrier-handle'
import type {ProductStock} from './StockPanel'
/** Illustrative attachment and proportions, not a handle strength/gauge spec. */
export function CarrierHandle({width,height,style,stock}:{width:number;height:number;style:'twisted_paper'|'cotton_ropes'|'ribbon';stock:ProductStock}){
 const parts=useMemo(()=>{
  const radius=Math.min(width*.008,height*.009,.018),curve=carrierHandleCurve(width,height,style)
  const body=style==='ribbon'?createCarrierRibbon(width,height):new THREE.TubeGeometry(curve,96,radius,12,false)
  const material=stock.outside.clone();material.roughness=style==='ribbon'?.55:.92;if(style==='ribbon')material.side=THREE.DoubleSide
  if(style!=='twisted_paper'){material.map=null;material.color.set('#ded8c8');material.clearcoat=0;material.sheen=style==='ribbon'?.3:.6;material.sheenRoughness=.8}
  const ridgeMaterial=material.clone();ridgeMaterial.color.multiplyScalar(1.04)
  const frames=curve.computeFrenetFrames(240,false),points:THREE.Vector3[]=[]
  for(let i=0;i<=240;i++){const t=i/240,p=curve.getPoint(t),angle=t*Math.PI*48;points.push(p.addScaledVector(frames.normals[i],Math.cos(angle)*radius*.7).addScaledVector(frames.binormals[i],Math.sin(angle)*radius*.7))}
  const ridge=style==='twisted_paper'?new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),320,radius*.22,5,false):undefined
  const knot=style==='ribbon'?createCarrierRibbonKnot(width,height):style==='cotton_ropes'?new THREE.TorusKnotGeometry(radius*1.1,radius*.52,48,7,2,3):undefined
  return {body,material,ridge,ridgeMaterial,knot}
 },[width,height,style,stock.outside])
 useEffect(()=>()=>{parts.body.dispose();parts.ridge?.dispose();parts.knot?.dispose();parts.material.dispose();parts.ridgeMaterial.dispose()},[parts])
 return <group name={`carrier-handle-${style}`}><mesh geometry={parts.body} material={parts.material} castShadow/>{parts.ridge&&<mesh geometry={parts.ridge} material={parts.ridgeMaterial}/>}{parts.knot&&[-1,1].map(side=><mesh key={side} geometry={parts.knot} material={parts.material} position={[side*width*.19,height*.93,-width*(style==='ribbon'?.04:.022)]} castShadow/> )}</group>
}
