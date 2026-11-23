import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {catalogueCapabilitySnapshot} from '../scripts/catalogue-capability-snapshot.ts'

test('current capability document exactly matches catalogue intent and source counts',()=>{
 const root=resolve('..')
 const doc=readFileSync(resolve(root,'docs/CURRENT_CAPABILITIES.md'),'utf8')
 const block=doc.split('<!-- capability-snapshot:start -->\n')[1]?.split('\n<!-- capability-snapshot:end -->')[0]
 assert.equal(block,catalogueCapabilitySnapshot(root),'Update the capability snapshot after verifying registry/source changes; do not silently upgrade readiness')
})

test('historical reports cannot be mistaken for current completion evidence',()=>{
 for(const file of ['IMPLEMENTATION_STATUS.md','ARCHITECTURE.md','PROJECT_REVIEW.md','QUICK_SUMMARY.md']){
  const intro=readFileSync(resolve('../docs',file),'utf8').slice(0,1000)
  assert.match(intro,/Historical document/)
  assert.match(intro,/CURRENT_CAPABILITIES\.md/)
 }
 const readme=readFileSync('../README.md','utf8')
 assert.match(readme,/docs\/CURRENT_CAPABILITIES\.md/)
 assert.doesNotMatch(readme,/17 modules, 11 services, 18 Prisma|Fastify 4|Fastify-4-green/)
})
