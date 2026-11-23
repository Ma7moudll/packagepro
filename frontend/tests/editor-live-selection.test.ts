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


test('actual store legacy missing face migrates to front while explicit pouch side artwork survives',()=>{
 const store=loadStore(),s=()=>store.getState()
 s().applyCoreState((core:any)=>({...core,model:{...core.model,type:'stand_up_pouch'},layers:[{id:'legacy',type:'text',faceId:undefined},{id:'side',type:'text',faceId:'left'}]}))
 assert.deepEqual(s().layers.map((l:any)=>({id:l.id,faceId:l.faceId})),[{id:'legacy',faceId:'front'},{id:'side',faceId:'left'}])
})

test('single-layer gesture previews live, commits once and undoes/redoes exact endpoints',()=>{
 const store=loadStore(),s=()=>store.getState(),id=s().addLayer({type:'shape',name:'A',position:{x:10,y:20}},'front')
 const past=s().history.past.length;let stopped=0
 s().beginLayerGesture(id,()=>stopped++)
 for(let n=1;n<=8;n++){s().previewLayerGesture(id,(l:any)=>({...l,position:{x:10+n,y:20+n}}));assert.equal(s().history.past.length,past);assert.equal(s().history.present.layers[0].position.x,10+n)}
 s().finishLayerGesture();s().finishLayerGesture();assert.equal(stopped,1);assert.equal(s().history.past.length,past+1)
 s().undo();assert.deepEqual(s().layers[0].position,{x:10,y:20});s().redo();assert.deepEqual(s().layers[0].position,{x:18,y:28})
})

test('no-op, return-to-origin and cancelled gestures preserve redo; changed gesture invalidates redo',()=>{
 const store=loadStore(),s=()=>store.getState(),id=s().addLayer({type:'shape',name:'A',position:{x:10,y:20}},'front')
 s().updateLayer(id,(l:any)=>({...l,opacity:0.4}));s().undo()
 const past=s().history.past.length,future=s().history.future
 s().beginLayerGesture(id);s().finishLayerGesture();assert.equal(s().history.past.length,past);assert.equal(s().history.future,future)
 s().beginLayerGesture(id);s().previewLayerGesture(id,(l:any)=>({...l,position:{x:20,y:20}}));s().previewLayerGesture(id,(l:any)=>({...l,position:{x:10,y:20}}));s().finishLayerGesture();assert.equal(s().history.past.length,past);assert.equal(s().history.future,future)
 s().beginLayerGesture(id);s().previewLayerGesture(id,(l:any)=>({...l,position:{x:20,y:20}}));s().finishLayerGesture(true);assert.deepEqual(s().layers[0].position,{x:10,y:20});assert.equal(s().history.future,future)
 s().beginLayerGesture(id);s().previewLayerGesture(id,(l:any)=>({...l,position:{x:20,y:20}}));s().finishLayerGesture();assert.equal(s().history.future.length,0)
})

test('selection/view interruption and another edit finalize separately; Undo during gesture reverses it',()=>{
 const store=loadStore(),s=()=>store.getState(),id=s().addLayer({type:'shape',name:'A',position:{x:10,y:20}},'front')
 let stopped=0;s().beginLayerGesture(id,()=>stopped++);s().previewLayerGesture(id,(l:any)=>({...l,position:{x:20,y:20}}));s().setSelectedLayers([]);assert.equal(stopped,1);s().undo();assert.equal(s().layers[0].position.x,10)
 s().beginLayerGesture(id);s().previewLayerGesture(id,(l:any)=>({...l,position:{x:30,y:20}}));s().setViewMode('3d');s().undo();assert.equal(s().layers[0].position.x,10)
 s().beginLayerGesture(id);s().previewLayerGesture(id,(l:any)=>({...l,position:{x:40,y:20}}));s().updateLayer(id,(l:any)=>({...l,opacity:0.5}));s().undo();assert.equal(s().layers[0].position.x,40);s().undo();assert.equal(s().layers[0].position.x,10)
 s().beginLayerGesture(id);s().previewLayerGesture(id,(l:any)=>({...l,position:{x:50,y:20}}));s().undo();assert.equal(s().layers[0].position.x,10);s().redo();assert.equal(s().layers[0].position.x,50)
})

test('interruption captures final Fabric fields in the same transaction without recursive commit',()=>{
 const store=loadStore(),s=()=>store.getState(),id=s().addLayer({type:'shape',name:'A',position:{x:10,y:20}},'front'),past=s().history.past.length
 s().beginLayerGesture(id,()=>{s().previewLayerGesture(id,(l:any)=>({...l,position:{x:25,y:35}}));s().finishLayerGesture()})
 s().previewLayerGesture(id,(l:any)=>({...l,scale:{x:2,y:2}}));s().finishLayerGesture();assert.equal(s().history.past.length,past+1);assert.equal(s().layers[0].position.x,25)
 s().undo();assert.equal(s().layers[0].position.x,10);s().redo();assert.equal(s().layers[0].position.x,25)
})

test('another edit derives from final captured gesture state, not stale preview',()=>{
 const store=loadStore(),s=()=>store.getState(),id=s().addLayer({type:'shape',name:'A',position:{x:10,y:20}},'front')
 s().beginLayerGesture(id,()=>s().previewLayerGesture(id,(l:any)=>({...l,position:{x:25,y:20}})))
 s().previewLayerGesture(id,(l:any)=>({...l,position:{x:15,y:20}}))
 s().updateLayer(id,(l:any)=>({...l,opacity:0.5}));assert.equal(s().layers[0].position.x,25);assert.equal(s().layers[0].opacity,0.5)
 s().undo();assert.equal(s().layers[0].position.x,25);assert.equal(s().layers[0].opacity,1)
 s().undo();assert.equal(s().layers[0].position.x,10)
 s().redo();assert.equal(s().layers[0].position.x,25);s().redo();assert.equal(s().layers[0].opacity,0.5)
})
