import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('Docker builders include the unified catalogue shared source',()=>{
 for(const path of ['../frontend/Dockerfile','../backend/Dockerfile'])assert.match(readFileSync(path,'utf8'),/COPY shared\/ \/app\/shared\//)
 assert.match(readFileSync('../backend/Dockerfile','utf8'),/COPY --from=builder --chown=nodejs:nodejs \/app\/shared \/app\/shared/)
})
