import {describe,it,expect} from 'vitest';
import {planEgpBootstrap,rates} from './plan';
const legacy = () => rates.map(r=>({code:r.code,name:r.name,unitPrice:r.legacyUsd,currency:'USD',isActive:true,metadata:{source:'seed'}}));
describe('explicit EGP material bootstrap',()=>{
 it('inserts a complete numeric EGP rate card on a fresh database',()=>{const p=planEgpBootstrap([]);expect(p.insert).toHaveLength(23);expect(p.conflicts).toEqual([]);expect(p.insert.find(r=>r.code==='cardboard-kraft')!.unitPrice).toBe(0.000997)});
 it('replaces only exact known legacy USD seed rates with actual EGP prices',()=>{const p=planEgpBootstrap(legacy());expect(p.migrate).toHaveLength(23);expect(p.insert).toEqual([]);expect(p.migrate[0].unitPrice).not.toBe(p.migrate[0].legacyUsd)});
 it('preserves customized EGP prices and is idempotent',()=>{const p=planEgpBootstrap(legacy().map(r=>({...r,currency:'EGP',unitPrice:0.009})));expect(p.migrate).toEqual([]);expect(p.preserve).toHaveLength(23)});
 it('refuses active customized USD instead of converting or relabeling it',()=>{const rows=legacy();rows[0].unitPrice=0.123;expect(planEgpBootstrap(rows).conflicts).toContain(rows[0].code)});
 it('requires original seed metadata as well as numeric fingerprint',()=>{const rows=legacy();rows[0].metadata={source:'operator'};expect(planEgpBootstrap(rows).conflicts).toContain(rows[0].code)});
 it('refuses custom non-EGP rows and material name collisions',()=>{expect(planEgpBootstrap([{...legacy()[0],code:'custom',name:'custom'}]).conflicts).toContain('custom');expect(planEgpBootstrap([{...legacy()[0],code:'other'}]).conflicts).toContain(rates[0].code)});
});
