import {describe,it,expect} from 'vitest';
import {mkdtempSync,writeFileSync,chmodSync,rmSync} from 'fs';
import {tmpdir} from 'os';
import {join,resolve} from 'path';
import {spawnSync} from 'child_process';
describe('deployment health gate',()=>{
 it('propagates HTTP/connectivity failure and uses the real backend /health route',()=>{
  const dir=mkdtempSync(join(tmpdir(),'health-gate-'));
  try {
   const fake=join(dir,'curl');writeFileSync(fake,'#!/bin/sh\nprintf "%s\\n" "$@"\nexit "${FAKE_EXIT:-0}"\n');chmodSync(fake,0o700);
   const script=resolve('../scripts/check-deployment-health.sh');
   const env={...process.env,PATH:`${dir}:${process.env.PATH}`,BACKEND_URL:'https://backend.example.test/'};
   const ok=spawnSync('bash',[script],{env,encoding:'utf8'});expect(ok.status).toBe(0);expect(ok.stdout).toContain('https://backend.example.test/health');expect(ok.stdout).toContain('--fail');
   for(const status of ['22','7','28'])expect(spawnSync('bash',[script],{env:{...env,FAKE_EXIT:status}}).status).toBe(Number(status));
   expect(spawnSync('bash',[script],{env:{...env,BACKEND_URL:''}}).status).not.toBe(0);
  } finally {rmSync(dir,{recursive:true,force:true})}
 });
});
