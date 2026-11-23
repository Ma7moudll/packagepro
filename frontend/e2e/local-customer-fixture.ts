import {test as base,expect} from '@playwright/test'
import {randomUUID} from 'node:crypto'
import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import {BACKEND,QA_PASSWORD} from './helpers'

/** Real local register/verify/login, with one account per test. Production
 * throttles stay enabled. Never provisions or queries a remote database. */
export const test=base.extend<{localCustomer:{email:string;password:string}}>({
 localCustomer:async({request},use)=>{
  const raw=process.env.DATABASE_URL
  if(process.env.NODE_ENV!=='test'||process.env.EMAIL_PROVIDER!=='test'||!raw)throw new Error('Isolated local test database and email transport required')
  const db=new URL(raw)
  if(process.env.PACKAGEPRO_DISPOSABLE_E2E_DATABASE!=='yes'||!/^\/packagepro_e2e_[a-z0-9_]+$/.test(db.pathname))throw new Error('Explicit disposable E2E opt-in and packagepro_e2e_ database name required')
  if(!['localhost','127.0.0.1','[::1]'].includes(db.hostname))throw new Error('Only a local disposable fixture database is allowed')
  const socket=db.searchParams.get('host')
  if(socket&&!socket.startsWith('/tmp/'))throw new Error('Only local temporary database sockets are allowed')
  const email=`qa-handoff-${randomUUID()}@packagepro.test`
  const registered=await request.post(BACKEND+'/auth/register',{data:{email,password:QA_PASSWORD,name:'Isolated handoff QA',firstName:'Local',lastName:'Fixture'}})
  expect(registered.status()).toBe(201)
  const requireBackend=createRequire(resolve(process.cwd(),'../backend/package.json'))
  const {PrismaClient}=requireBackend('@prisma/client')
  const prisma=new PrismaClient({datasources:{db:{url:raw}}})
  let token:string|undefined
  try{
   const user=await prisma.user.findUnique({where:{email},select:{id:true}})
   if(!user)throw new Error('Local fixture registration did not create a user')
   const verification=await prisma.emailVerificationToken.findFirst({where:{userId:user.id,usedAt:null},orderBy:{createdAt:'desc'},select:{token:true}})
   token=verification?.token
  }finally{await prisma.$disconnect()}
  if(!token)throw new Error('Local fixture verification token missing')
  const verified=await request.post(BACKEND+'/auth/verify-email',{data:{token}})
  expect(verified.status()).toBe(200)
  await use({email,password:QA_PASSWORD})
  // Keep fixture rows for diagnosis in the disposable database. The runner
  // owns dropping that database after collecting the test artifacts.
 },
})
export {expect}
