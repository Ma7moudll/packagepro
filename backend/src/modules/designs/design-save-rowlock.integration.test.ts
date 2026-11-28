import {afterAll,it,expect,vi} from 'vitest';
import {prisma} from '../../lib/prisma';
import {designService} from './design.service';
let uid='';const ids:string[]=[];
afterAll(async()=>{await prisma.design.deleteMany({where:{id:{in:ids}}});if(uid)await prisma.user.delete({where:{id:uid}})});
it('external lifecycle writer is blocked by the saver row lock until save commits',async()=>{
 const u=await prisma.user.create({data:{email:`rl-${Date.now()}@test.local`,passwordHash:'x',customer:{create:{}}}});uid=u.id;
 const sid=`rl-${Date.now()}`;const d0=await designService.saveDesign({sessionId:sid,designData:{v:0}} as any,u.id);ids.push(d0.id);
 let reached!:()=>void,release!:()=>void;const at=new Promise<void>(r=>reached=r);const gate=new Promise<void>(r=>release=r);let hooked=false;
 const transaction=prisma.$transaction.bind(prisma);
 const spy=vi.spyOn(prisma,'$transaction').mockImplementation((async(cb:any)=>transaction(async(tx:any)=>{
  const read=tx.design.findUnique.bind(tx.design);
  return cb(new Proxy(tx,{get(t,k){if(k!=='design')return t[k];return new Proxy(tx.design,{get(m,kk){if(kk!=='findUnique')return m[kk];return async(args:any)=>{const row=await read(args);if(!hooked&&args.include){hooked=true;reached();await gate}return row}}})}}))
 })) as any);
 try{
  const save=designService.saveDesign({sessionId:sid,designData:{v:1}} as any,u.id);
  await at;
  let externalDone=false;const ext=prisma.design.update({where:{id:d0.id},data:{lifecycleStatus:'SUBMITTED'}}).then(()=>{externalDone=true});
  await new Promise(r=>setTimeout(r,800));const mid=externalDone;
  release();await save;await ext;
  const fin=await prisma.design.findUniqueOrThrow({where:{id:d0.id}});
  console.log('ROWLOCK external finished while saver paused:',mid,'| final',fin.lifecycleStatus,JSON.stringify(fin.designData));
  expect(mid).toBe(false);
 }finally{release();spy.mockRestore()}
},30000);
