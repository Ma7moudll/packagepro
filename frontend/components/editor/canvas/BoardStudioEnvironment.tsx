"use client"
import { Environment, Lightformer } from "@react-three/drei"
/** Local studio reflection cards. No remote HDR download or artwork recolour. */
export function BoardStudioEnvironment(){return <Environment resolution={128} frames={1}>
 <Lightformer intensity={4} position={[-3,5,-3]} rotation={[Math.PI/2,0,0]} scale={[8,1,1]} />
 <Lightformer intensity={1} position={[3,2,4]} rotation={[0,Math.PI/4,0]} scale={[1.2,5,1]} />
 <Lightformer intensity={.5} position={[-4,2,-2]} rotation={[0,-Math.PI/2,0]} scale={[4,4,1]} />
</Environment>}
