import * as THREE from 'three'

/** Dimensions and assembly details are illustrative, not a cup tool or grade. */
export function cupConstruction(baseDiameter:number,rimDiameter:number,height:number,clear=false){
 if(![baseDiameter,rimDiameter,height].every(n=>Number.isFinite(n)&&n>0))throw new RangeError('Positive finite cup dimensions required')
 const bottom=baseDiameter/2,top=rimDiameter/2
 const thickness=Math.min(clear?.0018:.003,bottom/25,height/60)
 const rim=Math.min(clear?.004:.006,top/18,height/40)
 const floor=Math.min(height*(clear?.018:.045),bottom*.12)
 return {bottom,top,height,thickness,rim,floor,wallTop:height-rim}
}
export type CupConstruction=ReturnType<typeof cupConstruction>
export function cupRadius(c:CupConstruction,y:number){return c.bottom+(c.top-c.rim-c.bottom)*Math.max(0,Math.min(1,y/c.wallTop))}
/** Front/back half-wraps keep separate artwork IDs. The seam is not an unroll. */
export function createCupHalf(c:CupConstruction,back=false,inside=false,offset=0){
 const nx=40,ys=inside?[c.floor,c.wallTop]:[0,c.floor,c.wallTop],p:number[]=[],uv:number[]=[],indices:number[]=[]
 for(const y of ys)for(let i=0;i<=nx;i++){
  const u=i/nx,a=-Math.PI/2+u*Math.PI+(back?Math.PI:0),r=cupRadius(c,y)-(inside?c.thickness:0)+offset
  p.push(r*Math.sin(a),y,r*Math.cos(a));uv.push(inside?1-u:u,y/c.height)
 }
 for(let j=0;j<ys.length-1;j++)for(let i=0;i<nx;i++){
  const a=j*(nx+1)+i,b=a+1,d=a+nx+2,e=d-1
  if(inside)indices.push(a,d,b,a,e,d);else indices.push(a,b,d,a,d,e)
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g
}
/** Narrow overlapped paper sidewall at the rear, absent from moulded clear cups. */
export function createCupSeam(c:CupConstruction){
 const points:number[]=[],uv:number[]=[]
 for(const y of [c.floor,c.wallTop-c.rim])for(const a of [Math.PI-.025,Math.PI+.025]){
  const r=cupRadius(c,y)+c.thickness*.4;points.push(r*Math.sin(a),y,r*Math.cos(a));uv.push(.5+(a-Math.PI)/Math.PI,y/c.height)
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex([0,1,3,0,3,2]);g.computeVertexNormals();g.computeBoundingBox();return g
}
