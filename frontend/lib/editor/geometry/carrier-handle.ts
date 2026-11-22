import * as THREE from 'three'
/** Preview proportions only. No attachment strength or handle gauge implied. */
export function carrierHandleCurve(width:number,height:number,style:'twisted_paper'|'cotton_ropes'|'ribbon'='twisted_paper'){
 const span=width*.19,embed=height*.07,rise=width*.26
 if(style==='twisted_paper')return new THREE.CubicBezierCurve3(new THREE.Vector3(-span,height-embed,0),new THREE.Vector3(-span,height+rise,width*.03),new THREE.Vector3(span,height+rise,width*.03),new THREE.Vector3(span,height-embed,0))
 const y=height-embed,z=-width*(style==='ribbon'?.034:.018)
 return new THREE.CatmullRomCurve3([
  new THREE.Vector3(-span,y,z),new THREE.Vector3(-span,y,0),
  new THREE.Vector3(-span*.98,height+width*.08,width*.03),new THREE.Vector3(-span*.65,height+width*.25,width*.065),
  new THREE.Vector3(0,height+width*.29,width*.075),
  new THREE.Vector3(span*.65,height+width*.25,width*.065),new THREE.Vector3(span*.98,height+width*.08,width*.03),
  new THREE.Vector3(span,y,0),new THREE.Vector3(span,y,z)
 ],false,'centripetal')
}
function ribbonSurface(curve:THREE.Curve<THREE.Vector3>,halfWidth:number,segments:number,twistAmount:number){
 const p:number[]=[],uv:number[]=[],indices:number[]=[]
 for(let i=0;i<=segments;i++){
  const t=i/segments,c=curve.getPoint(t),tangent=curve.getTangent(t),twist=Math.sin(Math.PI*t)*twistAmount
  const direction=new THREE.Vector3(-tangent.y,tangent.x,0)
  if(direction.lengthSq()<1e-10)direction.set(1,0,0)
  direction.normalize().applyAxisAngle(tangent,twist).multiplyScalar(halfWidth)
  for(const side of [-1,1]){const v=c.clone().addScaledVector(direction,side);p.push(v.x,v.y,v.z);uv.push((side+1)/2,t)}
 }
 for(let i=0;i<segments;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g
}
/** Ribbon is a twisting strip, not an extruded die-cut arch or round rope. */
export function createCarrierRibbon(width:number,height:number){
 return ribbonSurface(carrierHandleCurve(width,height,'ribbon'),Math.min(width*.028,height*.035),96,1.05)
}
/** Folded flat-band stop on the inside, not a cylindrical rope knot. */
export function createCarrierRibbonKnot(width:number,height:number){
 const half=Math.min(width*.028,height*.035),a=half*1.2
 const points=[[-1.2,-.6,0],[-.3,.1,-.1],[.75,.3,-.2],[.45,.7,.2],[-.55,.35,.35],[-.4,-.35,-.25],[.55,-.55,-.15]].map(([x,y,z])=>new THREE.Vector3(x*a,y*a,z*a))
 return ribbonSurface(new THREE.CatmullRomCurve3(points,false,'centripetal'),half*.55,64,.85)
}
