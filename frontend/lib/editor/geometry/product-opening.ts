/** Damped preview motion. It never changes the user's saved target or history. */
export function productOpeningStep(current:number,target:number,delta:number,reducedMotion=false){
 const clamp=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0)),a=clamp(current),b=clamp(target)
 if(reducedMotion||Math.abs(a-b)<.0003)return b
 const dt=Math.max(0,Math.min(.1,delta||0));return a+(b-a)*(1-Math.exp(-10*dt))
}
