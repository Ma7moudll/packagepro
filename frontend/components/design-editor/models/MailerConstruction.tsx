"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { createMailerPanel, mailerConstruction, mailerFoldAngles, type PanelProfile } from "@/lib/editor/geometry/mailer-construction"

type V3 = [number, number, number]
type Material = THREE.MeshStandardMaterial

function Board({ width, height, thickness, outside, inside, edge, position = [0,0,0], rotation = [0,0,0], profile = "rounded", radius = 0.025, faceId }: {
  width: number; height: number; thickness: number; outside: Material; inside: Material; edge: Material;
  position?: V3; rotation?: V3; profile?: PanelProfile; radius?: number; faceId?: string
}) {
  const geometry = useMemo(() => createMailerPanel(width, height, thickness, profile, radius), [width,height,thickness,profile,radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={[outside, inside, edge]} position={position} rotation={rotation} castShadow receiveShadow userData={faceId ? { faceId } : {}} />
}

/** Physical roll-end mailer. Artwork remains on the six existing canonical faces;
 * new manufacturing parts are decorative, so they cannot hijack face picking.
 */
export function MailerConstruction({ l,w,h,open, outside,inside,front,back,left,right,top,bottom, tone }: {
  l:number; w:number; h:number; open:number; outside:Material; inside:Material;
  front:Material; back:Material; left:Material; right:Material; top:Material; bottom:Material;
  tone: "kraft" | "white" | "white-imported"
}) {
  const c = mailerConstruction(l,w,h), b = c.thickness
  const edgeMap = useMemo(() => {
    const canvas = document.createElement("canvas")
    canvas.width = 128; canvas.height = 64
    const ctx = canvas.getContext("2d")!
    ctx.fillStyle = tone === "kraft" ? "#a68b63" : "#c7baa0"
    ctx.fillRect(0,0,128,64)
    ctx.strokeStyle = tone === "kraft" ? "#695738" : "#8f8067"
    ctx.lineWidth = 4
    ctx.beginPath()
    for (let x=0;x<=128;x++) {
      const y=32+Math.sin(x*Math.PI/32)*20
      if(x===0)ctx.moveTo(x,y); else ctx.lineTo(x,y)
    }
    ctx.stroke()
    ctx.fillStyle = tone === "kraft" ? "#c1a77e" : "#e0d5be"
    ctx.fillRect(0,0,128,9); ctx.fillRect(0,55,128,9)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.anisotropy = 8
    return texture
  }, [tone])
  const edge = useMemo(() => new THREE.MeshStandardMaterial({ map: edgeMap, roughness: 0.97 }), [edgeMap])
  const crease = useMemo(() => new THREE.MeshStandardMaterial({ color: tone === "kraft" ? "#796547" : "#a8a69f", roughness: 1 }), [tone])
  useEffect(() => () => {edge.dispose(); edgeMap.dispose(); crease.dispose()}, [edge,edgeMap,crease])
  const lidWidth = l - b * 4.4
  const lidDepth = w - b * 1.3
  const angles = mailerFoldAngles(open)
  const lidRef = useRef<THREE.Group>(null)
  const tuckRef = useRef<THREE.Group>(null)
  const wingRefs = useRef<Array<THREE.Group | null>>([])
  const progress = useRef(open)
  const reducedMotion = useRef(false)
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => { reducedMotion.current = preference.matches }
    update(); preference.addEventListener("change", update)
    return () => preference.removeEventListener("change", update)
  }, [])
  useFrame((_, delta) => {
    progress.current = reducedMotion.current ? open : THREE.MathUtils.damp(progress.current, open, 9, Math.min(delta, 0.1))
    if (Math.abs(progress.current - open) < 0.0001) progress.current = open
    const pose = mailerFoldAngles(progress.current)
    if (lidRef.current) lidRef.current.rotation.x = pose.lid
    if (tuckRef.current) tuckRef.current.rotation.x = pose.tuck
    wingRefs.current.forEach((wing, i) => { if (wing) wing.rotation.z = (i === 0 ? 1 : -1) * pose.wing })
  })
  const lidAngle = angles.lid
  const tuckAngle = angles.tuck
  const wingAngle = angles.wing
  const p = { thickness:b, inside, edge, radius:c.cornerRadius }
  return <group name="mailer-construction">
    <Board {...p} width={l-b*2} height={h} outside={front} position={[0,h/2,w/2-b/2]} profile="notch" faceId="front" />
    <Board {...p} width={l-b*2} height={h-b} outside={back} position={[0,(h-b)/2,-w/2+b/2]} rotation={[0,Math.PI,0]} faceId="back" />
    <Board {...p} width={w} height={h} outside={left} position={[-l/2+b/2,h/2,0]} rotation={[0,-Math.PI/2,0]} faceId="left" />
    <Board {...p} width={w} height={h} outside={right} position={[l/2-b/2,h/2,0]} rotation={[0,Math.PI/2,0]} faceId="right" />
    <Board {...p} width={l-b*2} height={w-b*2} outside={bottom} position={[0,b/2,0]} rotation={[-Math.PI/2,0,0]} faceId="bottom" />

    {/* Rolled-over side walls: separate inner liner, rounded bridge and a
        narrow receiver channel between them for the lid's locking wings. */}
    {[-1,1].map(side => <group key={side}>
      <Board {...p} width={w-b*2.8} height={h-b*1.6} outside={inside} position={[side*(l/2-b*3.5),(h-b*1.6)/2+b,0]} rotation={[0,side*Math.PI/2,0]} />
      {[b*.5,b*3.5].map(inset => <Board key={inset} {...p} width={b*1.05} height={w-b*1.2} outside={outside} position={[side*(l/2-inset),h-b*.6,0]} rotation={[-Math.PI/2,0,0]} radius={b*.3} />)}
      {/* Interior return-foot and compressed score at the floor. */}
      <mesh position={[side*(l/2-b*4.5),b*1.2,0]} receiveShadow>
        <boxGeometry args={[b*2,b*.55,w-b*4]} /><primitive object={inside} attach="material" />
      </mesh>
      <mesh position={[side*(l/2-b*5.4),b*1.51,0]}>
        <boxGeometry args={[b*.15,b*.08,w-b*5]} /><primitive object={crease} attach="material" />
      </mesh>
    </group>)}

    {/* Front return corners have actual overlaps, not painted vertical lines. */}
    {[-1,1].map(side => <Board key={side} {...p} width={Math.min(l*.13,h*.3)} height={h-b*2.2} outside={inside} position={[side*(l/2-Math.min(l*.13,h*.3)/2-b*2),h/2,w/2-b*3]} />)}

    <group ref={lidRef} position={[0,h+b*.55,-w/2+b*.8]} rotation={[lidAngle,0,0]} name="hinged-lid">
      <Board {...p} width={lidWidth} height={lidDepth} outside={top} position={[0,0,lidDepth/2]} rotation={[-Math.PI/2,0,0]} faceId="top" />
      {/* Double score hinge, locally compressed board. */}
      {[b*.8,b*1.5].map(z => <mesh key={z} position={[0,-b*.55,z]}>
        <boxGeometry args={[lidWidth-b,b*.12,b*.13]} /><primitive object={crease} attach="material" />
      </mesh>)}
      <group ref={tuckRef} position={[0,-b*.15,lidDepth-b*1.25]} rotation={[tuckAngle,0,0]}>
        <Board {...p} width={lidWidth-b*2} height={c.tuckDepth} outside={inside} inside={outside} position={[0,0,c.tuckDepth/2]} rotation={[Math.PI/2,0,0]} profile="tuck" />
        <mesh position={[0,b*.57,b*.35]}><boxGeometry args={[lidWidth-b*3,b*.1,b*.12]} /><primitive object={crease} attach="material" /></mesh>
      </group>
      {/* Lid-mounted locking wings. Closed they slide into the double-wall
          channels; open they travel with the lid, never float on the body. */}
      {[-1,1].map((side, i) => <group key={side} ref={node => { wingRefs.current[i] = node }} position={[side*lidWidth/2,-b*.15,lidDepth*.49]} rotation={[0,0,-side*wingAngle]}>
        <Board {...p} width={c.wingDepth} height={lidDepth*.79} outside={outside} position={[side*c.wingDepth/2,0,0]} rotation={[-Math.PI/2,0,0]} profile="wing" />
      </group>)}
    </group>
  </group>
}
