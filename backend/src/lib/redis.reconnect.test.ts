import {describe,it,expect,vi,afterEach} from 'vitest';
const state=vi.hoisted(()=>({clients:[] as any[]}));
vi.mock('ioredis',()=>({default:class {
 status='wait';options:any;handlers:any={};
 constructor(_url:string,options:any){this.options=options;state.clients.push(this)}
 on(name:string,handler:any){this.handlers[name]=handler;return this}
 async connect(){this.status='reconnecting';throw new Error('temporary outage')}
 disconnect(){this.status='end'}
}}));
import {getRedisClient,connectRedis,disconnectRedis,isRedisEnabled} from './redis';
afterEach(async()=>{await disconnectRedis();vi.unstubAllEnvs()});
describe('Redis recovery without fail-open',()=>{
 it('retains failed client for bounded backoff, refuses until ready, then recovers',async()=>{vi.stubEnv('REDIS_URL','redis://localhost:1');await disconnectRedis();await connectRedis();const c=getRedisClient() as any;expect(c).not.toBeNull();expect(isRedisEnabled()).toBe(false);expect(c.options.retryStrategy(1)).toBe(250);expect(c.options.retryStrategy(99)).toBe(30000);c.status='connect';expect(isRedisEnabled()).toBe(false);c.status='ready';expect(isRedisEnabled()).toBe(true);c.status='reconnecting';expect(isRedisEnabled()).toBe(false);expect(getRedisClient()).toBe(c);c.status='ready';expect(isRedisEnabled()).toBe(true);expect(c.options.enableOfflineQueue).toBe(false)});
});
