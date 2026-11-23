'use client'
import {useEffect,useMemo} from 'react'
import * as THREE from 'three'
import {cupConstruction,cupRadius,createCupHalf,createCupSeam} from '@/lib/editor/geometry/cup-construction'
import type {ProductShapeProps} from './StockPanel'

/** Clear stock uses raw transparent artwork, never the opaque board composite. */
function ClearCupInk({source,geometry,faceId}:{source?:string;geometry:THREE.BufferGeometry;faceId:string}){
 const ink=useMemo(()=>{
  if(!source)return null
  const texture=new THREE.TextureLoader().load(source);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8
  const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.015,roughness:.58,metalness:0,side:THREE.DoubleSide})
  return {texture,material}
 },[source])
 useEffect(()=>()=>{ink?.texture.dispose();ink?.material.dispose()},[ink])
 return ink?<mesh geometry={geometry} material={ink.material} renderOrder={3} userData={{faceId}} name={`clear-cup-ink-${faceId}`}/>:null
}

export function CupConstruction({dimensions,type,stock,textures}:ProductShapeProps&{textures?:Record<string,string>}){
 const clear=type.replace(/_/g,'-')==='smoothie-cup'
 const c=useMemo(()=>cupConstruction(dimensions.length/100,dimensions.width/100,dimensions.height/100,clear),[dimensions.length,dimensions.width,dimensions.height,clear])
 const parts=useMemo(()=>({outside:[false,true].map(back=>createCupHalf(c,back)),inside:[false,true].map(back=>createCupHalf(c,back,true)),ink:[false,true].map(back=>createCupHalf(c,back,false,c.thickness*.35)),seam:createCupSeam(c)}),[c])
 useEffect(()=>()=>{[...parts.outside,...parts.inside,...parts.ink,parts.seam].forEach(g=>g.dispose())},[parts])
 const plastic=useMemo(()=>new THREE.MeshPhysicalMaterial({color:'#dce8eb',transparent:true,opacity:.16,depthWrite:false,roughness:.08,metalness:0,clearcoat:.75,clearcoatRoughness:.07,side:THREE.DoubleSide}),[])
 useEffect(()=>()=>plastic.dispose(),[plastic])
 const baseRadius=cupRadius(c,c.floor)-c.thickness
 return <group name={clear?'clear-cup-construction':'paper-cup-construction'}>
  {[0,1].map(i=>{const face=i?'back':'front';return <group key={face}>
   <mesh geometry={parts.outside[i]} material={clear?plastic:stock.face(face)} castShadow={!clear} receiveShadow renderOrder={clear?1:0} userData={{faceId:face}} name={`cup-wall-${face}`}/>
   {clear?<ClearCupInk source={textures?.[face]} geometry={parts.ink[i]} faceId={face}/>:<mesh geometry={parts.inside[i]} material={stock.inner(face)} receiveShadow userData={{faceId:`inside_${face}`}} name={`cup-inside-${face}`}/>}
  </group>})}
  <mesh position={[0,c.height-c.rim,0]} rotation={[-Math.PI/2,0,0]} material={clear?plastic:stock.outside} renderOrder={clear?2:0} name="formed-cup-rim"><torusGeometry args={[c.top-c.rim,c.rim,10,72]}/></mesh>
  <mesh position={[0,c.floor,0]} rotation={[-Math.PI/2,0,0]} material={clear?plastic:stock.inner('bottom')} userData={{faceId:'inside_bottom'}} renderOrder={clear?1:0} name="recessed-cup-floor"><circleGeometry args={[baseRadius,64]}/></mesh>
  {!clear&&<>
   <mesh position={[0,c.floor-c.thickness,0]} rotation={[Math.PI/2,0,0]} material={stock.face('bottom')} userData={{faceId:'bottom'}} name="recessed-cup-underside"><circleGeometry args={[baseRadius,64]}/></mesh>
   <mesh material={stock.inside} name="folded-cup-bottom-skirt"><latheGeometry args={[[new THREE.Vector2(c.bottom,0),new THREE.Vector2(c.bottom-c.thickness,0),new THREE.Vector2(baseRadius,c.floor)],64]}/></mesh>
   <mesh geometry={parts.seam} material={stock.face('back')} name="paper-cup-overlap-seam"/>
  </>}
  {clear&&[.025,.84].map(v=><mesh key={v} position={[0,c.height*v,0]} rotation={[-Math.PI/2,0,0]} material={plastic} renderOrder={2} name="clear-cup-forming-ring"><torusGeometry args={[cupRadius(c,c.height*v),c.thickness*.65,6,64]}/></mesh>)}
 </group>
}
