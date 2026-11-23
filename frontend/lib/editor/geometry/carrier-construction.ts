import * as THREE from 'three'

/** Split every triangle equally so shared edges remain conforming after warp.
 * Adaptive one-edge splits otherwise leave T-junctions and diagonal outlines. */
function subdividePaper(raw:THREE.BufferGeometry,levels:number){
 let positions=Array.from(raw.getAttribute('position').array),normals=Array.from(raw.getAttribute('normal').array)
 for(let level=0;level<levels;level++){
  const next:number[]=[],nextNormals:number[]=[]
  for(let i=0;i<positions.length;i+=9){
   const vertices=[positions.slice(i,i+3),positions.slice(i+3,i+6),positions.slice(i+6,i+9)]
   const ns=[normals.slice(i,i+3),normals.slice(i+3,i+6),normals.slice(i+6,i+9)]
   for(const [a,b] of [[0,1],[1,2],[2,0]]){vertices.push(vertices[a].map((n,j)=>(n+vertices[b][j])/2));ns.push(ns[a].map((n,j)=>(n+ns[b][j])/2))}
   for(const v of [0,3,5,3,1,4,5,4,2,3,4,5]){next.push(...vertices[v]);nextNormals.push(...ns[v])}
  }
  positions=next;normals=nextNormals
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));return g
}

export type CarrierStyle='none'|'twisted_paper'|'cotton_ropes'|'ribbon'
export function carrierMounts(width:number,height:number,style:CarrierStyle){
 return {span:width*.19,y:height*.93,holeX:Math.min(style==='ribbon'?width*.034:width*.014,height*.075),holeY:Math.min(style==='ribbon'?width*.01:width*.014,height*.018),punched:style==='cotton_ropes'||style==='ribbon'}
}
/** Turn-top and front/back are formed from the same sheet shape, including
 * actual punched holes. Paper deformation is illustrative, not a load model. */
export function createCarrierWall(width:number,depth:number,height:number,thickness:number,style:CarrierStyle,turnTop=false){
 const shape=new THREE.Shape(),bottom=turnTop?height*.88:0
 shape.moveTo(-width/2,bottom);shape.lineTo(width/2,bottom);shape.lineTo(width/2,height);shape.lineTo(-width/2,height);shape.closePath()
 const m=carrierMounts(width,height,style)
 if(m.punched)for(const sign of [-1,1]){const hole=new THREE.Path();hole.absellipse(sign*m.span,m.y,m.holeX,m.holeY,0,Math.PI*2,true);shape.holes.push(hole)}
 const raw=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,steps:1,curveSegments:12})
 raw.translate(0,0,-thickness/2)
 const g=subdividePaper(raw,m.punched?2:3);raw.dispose()
 const p=g.getAttribute('position'),normal=g.getAttribute('normal'),uv=g.getAttribute('uv')
 g.clearGroups();let start=0,last=-1
 for(let i=0;i<p.count;i+=3){
  const nz=normal.getZ(i),material=nz>.99?0:nz<-.99?1:2
  if(last!==material){if(last>=0)g.addGroup(start,i-start,last);start=i;last=material}
 }
 g.addGroup(start,p.count-start,last)
 const warp=(x:number,y:number)=>{
  const u=(x+width/2)/width,v=y/height,top=Math.max(0,Math.min(1,(v-.76)/.12)),stiffTop=1-top*top*(3-2*top)
  return depth*.045*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*stiffTop+depth*.01*Math.sin(u*Math.PI*6)*Math.exp(-Math.pow((v-.12)/.11,2))*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)
 }
 const epsilon=.0001
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),u=(x+width/2)/width,v=y/height,nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i)
  const dx=(warp(x+epsilon,y)-warp(x-epsilon,y))/(2*epsilon),dy=(warp(x,y+epsilon)-warp(x,y-epsilon))/(2*epsilon)
  const n=new THREE.Vector3(nx-dx*nz,ny-dy*nz,nz).normalize()
  p.setZ(i,p.getZ(i)+warp(x,y));normal.setXYZ(i,n.x,n.y,n.z)
  uv.setXY(i,nz<-.99?1-u:u,v)
 }
 p.needsUpdate=true;uv.needsUpdate=true;normal.needsUpdate=true;g.computeBoundingBox();return g
}

/** A side gusset opens out at its block bottom and folds inward higher up.
 * It is not four rigid box walls, nor a manufactured crease/adhesive spec. */
export function createCarrierGusset(width:number,depth:number,height:number,side:number,front:number,inside=false){
 const columns=8,rows=20,fold=Math.min(width*.06,depth*.18),p:number[]=[],uv:number[]=[],indices:number[]=[]
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const u=i/columns,v=j/rows,release=Math.min(1,v/.3),smooth=release*release*(3-2*release)
  const indent=fold*smooth*(.8+.2*Math.sin(Math.PI*v/2))
  const z=front*depth/2*(1-u)
  p.push(side*(width/2-indent*u),height*v,z)
  const uFace=side===1?z/depth+.5:.5-z/depth
  uv.push(inside?1-uFace:uFace,v)
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1
  if((side===front)!==inside)indices.push(a,b,d,a,d,c);else indices.push(a,d,b,a,c,d)
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g
}
