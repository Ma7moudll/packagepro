"use client"
import {useEffect,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {OrbitControls} from '@react-three/drei'
import type {PreviewFamily} from '@/lib/editor/product-preview-coverage'
import {productOpeningStep} from '@/lib/editor/geometry/product-opening'
import {productOpeningFraming,reframeOpeningCamera,type OpeningFraming} from '@/lib/editor/geometry/product-opening-camera'

/** Apply only the change in opening allowance, so orbit input stays the user's. */
export function ProductOpeningCamera({family,dimensions,open,camDist}:{camDist:number;family:PreviewFamily|undefined;dimensions:{length:number;width:number;height:number};open:number}){
 const controls=useRef<any>(null),initialTarget=useRef<[number,number,number]>([0,dimensions.height/200,0])
 const progress=useRef(open),previous=useRef<OpeningFraming>({scale:1,lift:dimensions.height/200}),reduced=useRef(false)
 useEffect(()=>{const q=window.matchMedia('(prefers-reduced-motion: reduce)'),read=()=>{reduced.current=q.matches};read();q.addEventListener('change',read);return()=>q.removeEventListener('change',read)},[])
 useFrame((_,delta)=>{
  const c=controls.current
  if(!c)return
  progress.current=productOpeningStep(progress.current,open,delta,reduced.current)
  const allowance=productOpeningFraming(family,dimensions,progress.current)
  const next={scale:allowance.scale,lift:dimensions.height/200+allowance.lift}
  if(next.scale===previous.current.scale&&next.lift===previous.current.lift)return
  const frame=reframeOpeningCamera(c.object.position.toArray(),c.target.toArray(),previous.current,next)
  c.object.position.fromArray(frame.position);c.target.fromArray(frame.target);c.update();previous.current=next
 })
 return <OrbitControls ref={controls} enablePan enableZoom enableRotate minDistance={camDist*.35} maxDistance={camDist*2.6} minPolarAngle={Math.PI/8} maxPolarAngle={Math.PI/2.1} autoRotate={false} target={initialTarget.current}/>
}
