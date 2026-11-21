"use client"
import { Environment, Lightformer } from "@react-three/drei"
/** Local studio reflection cards. No remote HDR download or artwork recolour. */
export function BoardStudioEnvironment(){return <Environment resolution={256} frames={1}>
 <Lightformer intensity={4} position={[-3,5,-3]} rotation={[Math.PI/2,0,0]} scale={[8,1,1]} />
 <Lightformer intensity={1} position={[3,2,4]} rotation={[0,Math.PI/4,0]} scale={[1.2,5,1]} />
 <Lightformer intensity={.5} position={[-4,2,-2]} rotation={[0,-Math.PI/2,0]} scale={[4,4,1]} />
 {/* Narrow bright strips, small solid angle: they add little diffuse light
     (matte stock stays as before) but reflect as a sharp streak on low-
     roughness glossy stock, which is what separates gloss from matte
     visually. Placed on the reflection path of the default orbit view for
     the lid (up-back-left) and the walls (front-left, low). */}
 <Lightformer intensity={10} position={[-3.0,2.8,-3.0]} rotation={[0,-Math.PI*0.75,0]} scale={[4.5,0.5,1]} />
 <Lightformer intensity={22} position={[-5,-1.8,-0.5]} rotation={[0,Math.PI/2,0]} scale={[3,1.2,1]} />
 <Lightformer intensity={22} position={[5,-1.8,0.5]} rotation={[0,-Math.PI/2,0]} scale={[3,1.2,1]} />
</Environment>}
