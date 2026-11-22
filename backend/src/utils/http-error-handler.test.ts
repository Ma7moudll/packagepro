import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { httpErrorHandler } from './http-error-handler';
import { AppError, ValidationError } from './errors';
vi.mock('./logger', () => ({logger:{error:vi.fn()}}));

describe('actual HTTP error responses', () => {
 for (const env of ['development','test','production']) {
  it(`contains internal errors in ${env}`, async () => {
   const old=process.env.NODE_ENV;process.env.NODE_ENV=env;
   const app=Fastify();app.setErrorHandler(httpErrorHandler);
   app.get('/db',async()=>{throw new Error('Prisma SELECT password FROM users at /srv/private/db.ts');});
   app.get('/app',async()=>{throw new AppError(503,'SQL connection private-host','PRIVATE_DB',{query:'secret'});});
   app.get('/library',async()=>{throw Object.assign(new Error('/private SQL details'),{statusCode:400});});
   app.get('/validation',async()=>{throw new ValidationError('Quantity must be positive',{sql:'private'});});
   try {
    for(const path of ['/db','/app','/library']){const r=await app.inject(path);expect(r.body).not.toMatch(/Prisma|SELECT|private|password|secret|SQL/);expect(r.json().requestId).toBeTruthy();}
    const r=await app.inject('/validation');expect(r.statusCode).toBe(400);expect(r.json().message).toBe('Quantity must be positive');expect(r.json()).not.toHaveProperty('details');
   } finally {await app.close();process.env.NODE_ENV=old;}
  });
 }
 it('does not expose Fastify validation payloads',async()=>{
  const app=Fastify();app.setErrorHandler(httpErrorHandler);app.post('/input',{schema:{body:{type:'object',required:['name'],properties:{name:{type:'string'}}}}},async()=>({ok:true}));
  const r=await app.inject({method:'POST',url:'/input',payload:{}});expect(r.statusCode).toBe(400);expect(r.json().message).toBe('Validation failed');expect(r.json()).not.toHaveProperty('details');await app.close();
 });
 it('preserves actual rate-limit Retry-After header',async()=>{
  const app=Fastify();app.setErrorHandler(httpErrorHandler);
  await app.register(rateLimit,{max:1,timeWindow:60000});app.get('/limited',async()=>({ok:true}));
  await app.inject('/limited');const r=await app.inject('/limited');
  expect(r.statusCode).toBe(429);expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
  expect(r.json().message).toBe('Too many requests');await app.close();
 });

});
