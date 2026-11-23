import * as THREE from 'three'
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Illustrative flute section. Editor distances are 100 mm per scene unit.
 * This is visible construction, not an approved board grade or caliper. */
export function corrugatedSection(thickness:number){
 const skin=thickness*.1,paper=thickness*.08
 return {skin,paper,pitch:thickness*2.25,amplitude:(thickness-2*skin-paper)/2}
}

/** A closed, finite-thickness waved paper sheet between the two liners.
 * Flutes run along local Y by default. No printed texture goes on cut edges. */
export function createCorrugatedCore(width:number,height:number,thickness:number,axis:'x'|'y'='y',phaseOffset=0){
 if(![width,height,thickness].every(v=>Number.isFinite(v)&&v>0))throw new RangeError('Positive finite board dimensions required')
 const {paper,pitch,amplitude}=corrugatedSection(thickness)
 const w=axis==='y'?width:height,h=axis==='y'?height:width
 const segments=Math.max(8,Math.ceil(w/pitch)*8),positions:number[]=[],indices:number[]=[]
 for(let i=0;i<=segments;i++){
  const x=-w/2+w*i/segments,phase=(x+w/2+phaseOffset)*2*Math.PI/pitch
  const z=Math.sin(phase)*amplitude,slope=Math.cos(phase)*amplitude*2*Math.PI/pitch
  const normal=new THREE.Vector2(-slope,1).normalize()
  for(const y of [-h/2,h/2])for(const side of [-1,1])positions.push(x+normal.x*paper*.5*side,y,z+normal.y*paper*.5*side)
 }
 for(let i=0;i<segments;i++){
  const a=i*4,b=a+4
  indices.push(a,b+2,b,a,a+2,b+2,a+1,b+1,b+3,a+1,b+3,a+3,a,b,b+1,a,b+1,a+1,a+2,b+3,b+2,a+2,a+3,b+3)
 }
 const end=segments*4
 indices.push(0,1,3,0,3,2,end,end+3,end+1,end,end+2,end+3)
 const g=new THREE.BufferGeometry()
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals()
 if(axis==='x')g.rotateZ(Math.PI/2)
 g.computeBoundingBox()
 return g
}

/** Only the exposed cut-edge depths need a rendered core. Keeping hidden
 * internal flutes out of the liner depth pass avoids raster bleed/moire. */
export function createCorrugatedCutEdges(width:number,height:number,thickness:number,axis:'x'|'y'='y'){
 const w=axis==='y'?width:height,h=axis==='y'?height:width,lip=Math.min(thickness*.65,w/6,h/6)
 const pieces:THREE.BufferGeometry[]=[]
 for(const sign of [-1,1]){
  const end=createCorrugatedCore(w,lip,thickness);end.translate(0,sign*(h/2-lip/2),0);pieces.push(end)
  const edge=createCorrugatedCore(lip,h-lip*2,thickness,'y',sign===-1?0:w-lip);edge.translate(sign*(w/2-lip/2),0,0);pieces.push(edge)
 }
 const g=mergeGeometries(pieces)!
 pieces.forEach(p=>p.dispose());if(axis==='x')g.rotateZ(Math.PI/2);g.computeBoundingBox();return g
}
