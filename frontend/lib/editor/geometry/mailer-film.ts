import * as THREE from 'three'
const skin=.0008
const clamp=(n:number)=>Math.max(0,Math.min(1,n))
/** Construction reference: https://www.proampac.com/en-us/product/polyjacket-flat-poly-mailers/
 * Flexible sheets, sealed sides and a fold-over self-seal flap only. Vendor
 * grades, gauges, performance and certifications are NOT imported.
 * Preview-only flexible mailer. Closed dimensions describe the body, not its
 * unfolded adhesive flap. No film gauge or seal allowance is certified here. */
export function mailerFilmPoint(width:number,height:number,depth:number,u:number,v:number,back=false,open=0,paper=false){
 const t=clamp(open),sx=Math.max(0,Math.sin(Math.PI*u)),sy=Math.max(0,Math.sin(Math.PI*v))
 const radius=Math.min(width,height)*.025,edgeDistance=Math.min(v,1-v)*height
 const inset=edgeDistance<radius?radius-Math.sqrt(Math.max(0,radius*radius-(radius-edgeDistance)**2)):0
 const tension=sx*sy
 const ridge=(d:number,size:number)=>Math.exp(-((d/size)**2))
 const folds=ridge(u-.09-.22*v,.025)*ridge(v-.16,.22)-.7*ridge(u-.87+.13*v,.021)*ridge(v-.78,.26)+.5*ridge(u-.17+.12*v,.018)*ridge(v-.84,.18)
 const wrinkle=Math.min(depth*.04,Math.min(width,height)*.002)*(paper?.2:1)*Math.sqrt(tension)*folds
 const bulge=Math.max(0,Math.min(depth*.5,depth*.5*tension**.78+wrinkle))
 const mouth=t*depth*.42*sx*v**8
 return {x:(u-.5)*(width-2*inset),y:v*height,z:(skin+bulge+mouth)*(back?-1:1)}
}
function grid(nx:number,ny:number,point:(u:number,v:number)=>{x:number;y:number;z:number},back=false){
 const p:number[]=[],uv:number[]=[],idx:number[]=[]
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny,a=point(u,v);p.push(a.x,a.y,a.z);uv.push(back?1-u:u,v)}
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;idx.push(...(back?[a,c,b,b,c,d]:[a,b,c,b,d,c]))}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}
export function createMailerFilmSurface(width:number,height:number,depth:number,back=false,open=0,paper=false){return grid(40,48,(u,v)=>mailerFilmPoint(width,height,depth,u,v,back,open,paper),back)}
export function mailerFlapPoint(width:number,height:number,depth:number,u:number,v:number,open=0){
 const t=clamp(open),sx=Math.max(0,Math.sin(Math.PI*u)),flap=height*.13
 const anchor=mailerFilmPoint(width,height,depth,u,1,true,t)
 const wrap=clamp(v/.12),closedZ=skin+depth*.5*sx*Math.sin(Math.PI*v*flap/height)
 return {x:anchor.x*(1-.018*v*v),y:height+Math.cos((1-t)*Math.PI)*v*flap,z:anchor.z+(1-t)*wrap*(closedZ-anchor.z)+t*Math.sin(Math.PI*v)*sx*.006}
}
export function createMailerFlap(width:number,height:number,depth:number,open=0){return grid(40,12,(u,v)=>mailerFlapPoint(width,height,depth,u,v,open))}

/** Inner adhesive release liner. It follows the flap rather than floating as
 * an independent rigid bar. Width/allowance remain illustrative only. */
export function createMailerReleaseLiner(width:number,height:number,depth:number,open=0){
 const t=clamp(open),angle=(1-t)*Math.PI
 return grid(32,2,(u,v)=>{const p=mailerFlapPoint(width,height,depth,.035+u*.93,.68+v*.16,t);return {...p,y:p.y-Math.sin(angle)*.001,z:p.z+Math.cos(angle)*.001}})
}
