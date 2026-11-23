import test from 'node:test'
import assert from 'node:assert/strict'
import {approvalProofUrl} from '../lib/orders/approval-proof.ts'
test('approval local PDF resolves to backend origin, never Next mock endpoint',()=>{
 assert.equal(approvalProofUrl('/api/files/approval-snapshots/request/proof.pdf','http://localhost:3000/api'),'http://localhost:3000/api/files/approval-snapshots/request/proof.pdf')
 assert.equal(approvalProofUrl('https://cdn.example.test/proof.pdf','https://backend.example.test/api'),'https://cdn.example.test/proof.pdf')
 assert.equal(approvalProofUrl('/api/files/proof.pdf','/api','https://shop.example.test'),'https://shop.example.test/api/files/proof.pdf')
 assert.equal(approvalProofUrl('javascript:alert(1)','http://localhost:3000/api'),null)
})
