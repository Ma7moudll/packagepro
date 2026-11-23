import * as THREE from "three"
/** Bulged flexible surface with flat sealed perimeter. Dimensions are preview
 * dimensions, not a heat-seal specification or production dieline. */
export function createPouchSurface(width:number,height:number,depth:number,back=false){
 const nx=32,ny=32,positions:number[]=[],uv:number[]=[],indices:number[]=[]
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,v=j/ny,shoulder=1-.06*Math.max(0,(v-.85)/.15)
  const z=(.002+depth*.5*Math.sin(Math.PI*u)*Math.sin(Math.PI*v))*(back?-1:1)
  positions.push((u-.5)*width*shoulder,v*height,z);uv.push(back?1-u:u,v)
 }
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1
  if(back)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c)
 }
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g
}
