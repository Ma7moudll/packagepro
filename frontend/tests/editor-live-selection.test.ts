import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {resolve,dirname,isAbsolute} from 'node:path'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

// Compile the actual client store and local dependencies with the same TS
// import elision as the app. No substitute store or textual source assertions.
function loadStore(){
 const cache=new Map<string,{exports:any}>()
 const load=(file:string):any=>{
  if(!existsSync(file)&&existsSync(file+'.ts'))file+='.ts'
  const prior=cache.get(file);if(prior)return prior.exports
  const module={exports:{} as any};cache.set(file,module)
  const nativeRequire=createRequire(file)
  const localRequire=(id:string)=>{
   const target=id.startsWith('@/')?resolve(id.slice(2)):id.startsWith('.')?resolve(dirname(file),id):null
   return target&&isAbsolute(target)?load(target):nativeRequire(id)
  }
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
  const run=vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})
  run(localRequire,module,module.exports);return module.exports
 }
 return load(resolve('lib/editor/state/store.ts')).useDesignStore
}

test('actual store layer updates retain newer live selection across repeated edits and history',()=>{
 const store=loadStore(),s=()=>store.getState()
 const a=s().addLayer({type:'text',name:'A'},'front')
 const b=s().addLayer({type:'text',name:'B'},'front')
 s().setSelectedLayers([a])
 assert.deepEqual(s().history.present.selectedLayerIds,[b],'history selection deliberately differs from live click')
 for(let i=1;i<=3;i++){
  s().updateLayer(a,(l:any)=>({...l,position:{x:i*10,y:i*5}}))
  assert.deepEqual(s().selectedLayerIds,[a],'editing must not revert live selection to prior history')
  assert.deepEqual(s().history.present.selectedLayerIds,[a])
 }
 s().undo();assert.equal(s().layers.find((l:any)=>l.id===a).position.x,20)
 s().redo();assert.equal(s().layers.find((l:any)=>l.id===a).position.x,30)
 assert.deepEqual(s().selectedLayerIds,[a])
 s().setSelectedLayers([a,b]);s().updateLayer(a,(l:any)=>({...l,opacity:0.5}))
 assert.deepEqual(s().selectedLayerIds,[a,b])
})
