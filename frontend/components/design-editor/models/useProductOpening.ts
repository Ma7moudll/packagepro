"use client"
import {useEffect,useRef,useState} from 'react'
import {useFrame} from '@react-three/fiber'
import {productOpeningStep} from '@/lib/editor/geometry/product-opening'
export function useProductOpening(target:number){
 const progress=useRef(target),reduced=useRef(false),[motion,setMotion]=useState(target)
 useEffect(()=>{const q=window.matchMedia('(prefers-reduced-motion: reduce)'),read=()=>{reduced.current=q.matches};read();q.addEventListener('change',read);return()=>q.removeEventListener('change',read)},[])
 useFrame((_,delta)=>{const next=productOpeningStep(progress.current,target,delta,reduced.current);if(next!==progress.current){progress.current=next;setMotion(next)}})
 return motion
}
