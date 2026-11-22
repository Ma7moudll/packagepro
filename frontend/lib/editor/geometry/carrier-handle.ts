import * as THREE from 'three'
/** Preview proportions only. No attachment strength or handle gauge implied. */
export function carrierHandleCurve(width:number,height:number){
 const span=width*.19,embed=height*.07,rise=width*.26
 return new THREE.CubicBezierCurve3(new THREE.Vector3(-span,height-embed,0),new THREE.Vector3(-span,height+rise,0),new THREE.Vector3(span,height+rise,0),new THREE.Vector3(span,height-embed,0))
}
/** Ribbon is a twisting strip, not an extruded die-cut arch or round rope. */
export function createCarrierRibbon(width:number,height:number){
 const curve=carrierHandleCurve(width,height),p:number[]=[],uv:number[]=[],indices:number[]=[],segments=96
 for(let i=0;i<=segments;i++){
  const t=i/segments,c=curve.getPoint(t),tangent=curve.getTangent(t),twist=Math.sin(Math.PI*t)*1.38
  const direction=new THREE.Vector3(-tangent.y,tangent.x,0).normalize().multiplyScalar(Math.cos(twist)).add(new THREE.Vector3(0,0,Math.sin(twist))).multiplyScalar(width*.028)
  for(const side of [-1,1]){const v=c.clone().addScaledVector(direction,side);p.push(v.x,v.y,v.z);uv.push((side+1)/2,t)}
 }
 for(let i=0;i<segments;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g
}
