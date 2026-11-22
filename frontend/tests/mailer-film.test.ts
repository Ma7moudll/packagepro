import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createMailerFilmSurface,mailerFilmPoint,mailerFlapPoint} from '../lib/editor/geometry/mailer-film.ts'
test('flexible mailer sheets meet at perimeter rather than vertical box walls',()=>{
 for(const back of [false,true])for(const open of [0,.5,1]){
  const g=createMailerFilmSurface(2.5,1.8,.2,back,open),p=g.getAttribute('position'),n=g.getAttribute('normal')
  for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i)));assert.ok(Math.abs(p.getX(i))<=1.2501);assert.ok(p.getY(i)>=0&&p.getY(i)<=1.8001);if(Math.abs(p.getX(i))>1.2499||p.getY(i)<.00001)assert.ok(Math.abs(p.getZ(i))<.00081)}g.dispose()
 }
 assert.ok(mailerFilmPoint(2.5,1.8,.2,.5,.5).z>.09)
 assert.ok(mailerFilmPoint(2.5,1.8,.2,.5,1,false,1).z>.08)
 assert.ok(mailerFilmPoint(2.5,1.8,.2,.5,1,false,0).z<.001)
})
test('adhesive flap remains connected through opening and closes over the front',()=>{
 for(const t of [0,.25,.5,.75,1])for(const u of [0,.25,.5,.75,1])assert.deepEqual(mailerFlapPoint(2.5,1.8,.2,u,0,t),mailerFilmPoint(2.5,1.8,.2,u,1,true,t))
 assert.ok(mailerFlapPoint(2.5,1.8,.2,.5,1,0).y<1.8);assert.ok(mailerFlapPoint(2.5,1.8,.2,.5,1,0).z>0);assert.ok(mailerFlapPoint(2.5,1.8,.2,.5,1,1).y>1.8)
})
