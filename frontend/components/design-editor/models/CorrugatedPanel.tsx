'use client'
import {useEffect,useMemo} from 'react'
import * as THREE from 'three'
import {createCorrugatedCutEdges,corrugatedSection} from '@/lib/editor/geometry/corrugated-board'
import {StockPanel,type ProductStock} from './StockPanel'

type Vec3=[number,number,number]
/** Two printable liners with a physical waved core. Geometry is illustrative,
 * not a supplier-approved flute profile or manufacturing specification. */
export function CorrugatedPanel({width,height,thickness,stock,faceId,uvRect,position=[0,0,0],rotation=[0,0,0],fluteAxis='y'}:{
 width:number;height:number;thickness:number;stock:ProductStock;faceId?:string;uvRect?:[number,number,number,number];position?:Vec3;rotation?:Vec3;fluteAxis?:'x'|'y'
}){
 const {skin}=corrugatedSection(thickness),offset=(thickness-skin)/2
 const core=useMemo(()=>createCorrugatedCutEdges(width-skin*.6,height-skin*.6,thickness,fluteAxis),[width,height,thickness,skin,fluteAxis])
 const shadow=useMemo(()=>({geometry:new THREE.BoxGeometry(width,height,thickness),material:new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false})}),[width,height,thickness])
 useEffect(()=>()=>core.dispose(),[core])
 useEffect(()=>()=>{shadow.geometry.dispose();shadow.material.dispose()},[shadow])
 const outer=faceId?stock.face(faceId):stock.outside,inner=faceId?stock.inner(faceId):stock.inside
 return <group position={position} rotation={rotation} name="corrugated-board-panel">
  <StockPanel width={width} height={height} thickness={skin} curveSegments={4} outside={outer} inside={stock.edge} edge={stock.edge} faceId={faceId} uvRect={uvRect} castShadow={false} position={[0,0,offset]}/>
  {/* A closed shadow envelope avoids acne between closely spaced liners.
      It is invisible in the colour pass and cannot intercept face picking. */}
  <mesh geometry={shadow.geometry} material={shadow.material} castShadow raycast={()=>{}} name="board-shadow-envelope"/>
  <mesh geometry={core} material={stock.edge} receiveShadow raycast={()=>{}} name="waved-paper-core"/>
  <StockPanel width={width} height={height} thickness={skin} curveSegments={4} outside={stock.edge} inside={inner} edge={stock.edge} faceId={faceId} uvRect={uvRect} castShadow={false} position={[0,0,-offset]}/>
 </group>
}
