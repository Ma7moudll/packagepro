import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mailerConstruction, mailerFoldAngles } from '../lib/editor/geometry/mailer-construction.ts'

test('opening sequence keeps locking wings out of the solid side walls',()=>{
 for(const [l,w,h] of [[2,1.5,1],[1.15,.7,.38],[.3,.2,.1],[6,4,3]]){
  const c=mailerConstruction(l,w,h),b=c.thickness,d=w-b*1.3,lidWidth=l-b*4.4
  for(let step=0;step<=100;step++){
   const {lid,wing}=mailerFoldAngles(step/100)
   for(let u=0;u<=20;u++) for(let v=0;v<=8;v++) for(const normal of [-b/2,b/2]){
    const x0=u/20*c.wingDepth,y0=normal,z0=d*.49+(v/8-.5)*d*.79
    const x=lidWidth/2+x0*Math.cos(wing)+y0*Math.sin(wing)
    const y1=-x0*Math.sin(wing)+y0*Math.cos(wing)
    const y=h+b*.55+y1*Math.cos(lid)-z0*Math.sin(lid)
    const z=-w/2+b*.8+y1*Math.sin(lid)+z0*Math.cos(lid)
    const withinWallHeight=y>0 && y<h
    const withinWallDepth=Math.abs(z)<w/2
    const outer=x>l/2-b && x<l/2
    const inner=x>l/2-b*4 && x<l/2-b*3
    assert.ok(!(withinWallHeight&&withinWallDepth&&(outer||inner)),`wing collision at progress ${step/100}, dimensions ${l},${w},${h}`)
   }
  }
 }
})

test('tuck lifts vertically out before unfolding and does not cross the front wall',()=>{
 for(const [l,w,h] of [[2,1.5,1],[1.15,.7,.38],[.3,.2,.1],[6,4,3]]){
  const c=mailerConstruction(l,w,h),b=c.thickness,d=w-b*1.3
  for(let step=0;step<=100;step++){
   const {lid,tuck}=mailerFoldAngles(step/100)
   for(let u=0;u<=40;u++) for(const normal of [-b/2,b/2]){
    const dist=u/40*c.tuckDepth
    const y0=-dist*Math.sin(tuck)+normal*Math.cos(tuck)
    const z0=d-b*1.25+dist*Math.cos(tuck)+normal*Math.sin(tuck)
    const y=h+b*.55+y0*Math.cos(lid)-z0*Math.sin(lid)
    const z=-w/2+b*.8+y0*Math.sin(lid)+z0*Math.cos(lid)
    assert.ok(!(y>0&&y<h&&z>w/2-b&&z<w/2),`tuck collision at ${step/100}`)
   }
  }
 }
})
