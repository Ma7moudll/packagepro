import {test,expect} from './local-customer-fixture'
import {loginViaApi} from './helpers'
for(const [language,width] of [['en',1280],['ar',390]] as const)for(const action of ['move','scale','rotate'] as const)test(`one gesture one Undo/Redo ${action} ${language} ${width}`,async({page,localCustomer},info)=>{
 await loginViaApi(page,localCustomer.email)
 await page.addInitScript(lang=>{localStorage.setItem('language',lang);document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.documentElement.lang=lang},language)
 await page.setViewportSize({width,height:900})
 await page.goto('/editor?product=custom-stand-up-pouch&editorDebug=1')
 await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-stand-up-pouch')
 await page.evaluate(()=>{(window as any).__gestureStore=(window as any).__editorStore;const s=(window as any).__gestureStore.getState();s.addLayer({id:'gesture',type:'shape',faceId:'front',name:'Undo fixture',position:{x:180,y:250},scale:{x:1,y:1},rotation:0,shapeProperties:{shape:'rect',fill:'#174e32'}});(window as any).__editorSetViewMode('2d')})
 await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='gesture'))
 const snapshot=()=>page.evaluate(()=>{const s=(window as any).__gestureStore.getState(),l=s.layers.find((l:any)=>l.id==='gesture');return {position:l.position,scale:l.scale,rotation:l.rotation,history:s.history.past.length}})
 const before=await snapshot()
 const center=await page.evaluate(()=>{const c=(window as any).__fabricCanvas,o=c.getObjects().find((o:any)=>o.layerId==='gesture'),p=o.getCenterPoint(),v=c.viewportTransform,r=c.upperCanvasEl.getBoundingClientRect();return {x:r.x+(p.x*v[0]+v[4])*r.width/c.width,y:r.y+(p.y*v[3]+v[5])*r.height/c.height}})
 await page.mouse.click(center.x,center.y)
 const point=await page.evaluate(action=>{const c=(window as any).__fabricCanvas,o=c.getObjects().find((o:any)=>o.layerId==='gesture'),r=c.upperCanvasEl.getBoundingClientRect();o.setCoords();const p=action==='scale'?o.oCoords.br:action==='rotate'?o.oCoords.mtr:null;return p?{x:r.x+p.x*r.width/c.width,y:r.y+p.y*r.height/c.height}:null},action)||center
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+30,point.y+25,{steps:8});await page.mouse.up()
 const after=await snapshot();expect(after.history).toBe(before.history+1)
 expect(after[action==='move'?'position':action==='scale'?'scale':'rotation']).not.toEqual(before[action==='move'?'position':action==='scale'?'scale':'rotation'])
 await page.keyboard.press('Control+z');expect(await snapshot()).toEqual(before)
 await page.screenshot({path:info.outputPath(`gesture-undo-${action}-${language}-${width}.png`)})
 if(action==='move'){
  await page.mouse.click(center.x+90,center.y+90)
  await page.mouse.click(center.x,center.y)
  expect(await page.evaluate(()=>(window as any).__gestureStore.getState().selectedLayerIds)).toEqual(['gesture'])
  await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+14,center.y+12,{steps:4});await page.mouse.up()
  const next=await snapshot();expect(next.history).toBe(before.history+1);expect(next.position).not.toEqual(before.position)
  await page.keyboard.press('Control+z');expect(await snapshot()).toEqual(before)
  await page.keyboard.press('Control+y');expect(await snapshot()).toEqual(next)
  await page.keyboard.press('Control+z')
  // The new drag correctly replaced the old redo branch, so compare against it.
  await page.keyboard.press('Control+y');expect(await snapshot()).toEqual(next)
  await page.screenshot({path:info.outputPath(`gesture-next-drag-${language}-${width}.png`)})
  return
 }
 await page.keyboard.press('Control+y');expect(await snapshot()).toEqual(after)
 await page.screenshot({path:info.outputPath(`gesture-${action}-${language}-${width}.png`)})
 console.log('GESTURE_ENDPOINTS',language,width,action,JSON.stringify({before,after}))
})

for(const ending of ['noop','return','cancel','touchcancel','blur','view','selection','undo-live','toolbar'] as const)test(`gesture lifecycle ${ending}`,async({page,localCustomer},info)=>{
 await loginViaApi(page,localCustomer.email)
 await page.goto('/editor?product=custom-stand-up-pouch&editorDebug=1')
 await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-stand-up-pouch')
 await page.evaluate(()=>{(window as any).__gestureStore=(window as any).__editorStore;const s=(window as any).__gestureStore.getState();s.addLayer({id:'gesture',type:'shape',faceId:'front',name:'Undo fixture',position:{x:180,y:250},scale:{x:1,y:1},rotation:0,shapeProperties:{shape:'rect',fill:'#174e32'}});s.updateLayer('gesture',(l:any)=>({...l,opacity:0.8}));s.undo();(window as any).__editorSetViewMode('2d')})
 await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='gesture'))
 const snap=()=>page.evaluate(()=>{const s=(window as any).__gestureStore.getState(),l=s.layers.find((l:any)=>l.id==='gesture');return {position:l.position,history:s.history.past.length,future:s.history.future.length,view:s.ui.viewMode}})
 const center=await page.evaluate(()=>{const c=(window as any).__fabricCanvas,o=c.getObjects().find((o:any)=>o.layerId==='gesture'),p=o.getCenterPoint(),v=c.viewportTransform,r=c.upperCanvasEl.getBoundingClientRect();return {x:r.x+(p.x*v[0]+v[4])*r.width/c.width,y:r.y+(p.y*v[3]+v[5])*r.height/c.height}})
 await page.mouse.click(center.x,center.y)
 const before=await snap()
 await page.mouse.move(center.x,center.y);await page.mouse.down()
 if(ending!=='noop')await page.mouse.move(center.x+30,center.y+25,{steps:8})
 const live=await snap();expect(live.history).toBe(before.history)
 if(ending==='return')await page.mouse.move(center.x,center.y,{steps:8})
 if(ending==='cancel')await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true})))
 if(ending==='touchcancel')await page.evaluate(()=>window.dispatchEvent(new Event('touchcancel',{bubbles:true})))
 if(ending==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')))
 if(ending==='view')await page.evaluate(()=>(window as any).__gestureStore.getState().setViewMode('3d'))
 if(ending==='selection')await page.evaluate(()=>(window as any).__gestureStore.getState().setSelectedLayers([]))
 if(ending==='undo-live')await page.keyboard.press('Control+z')
 if(['cancel','touchcancel','blur','selection','undo-live'].includes(ending))await page.mouse.move(center.x+60,center.y+50,{steps:4})
 await page.mouse.up()
 const after=await snap()
 if(ending!=='view')await expect.poll(()=>page.evaluate(()=>{const c=(window as any).__fabricCanvas,o=c.getObjects().find((o:any)=>o.layerId==='gesture'),l=(window as any).__gestureStore.getState().layers.find((l:any)=>l.id==='gesture');return Math.abs(o.left-l.position.x)+Math.abs(o.top-l.position.y)})).toBeLessThan(0.001)
 if(['noop','return','cancel','touchcancel'].includes(ending)){
  expect(after.position).toEqual(before.position);expect(after.history).toBe(before.history);expect(after.future).toBe(before.future)
 }else if(ending==='undo-live'){
  expect(after.position).toEqual(before.position);expect(after.history).toBe(before.history);expect(after.future).toBe(1)
  await page.keyboard.press('Control+y');expect((await snap()).position).toEqual(live.position)
 }else{
  expect(after.position).toEqual(live.position);expect(after.history).toBe(before.history+1);expect(after.future).toBe(0)
  if(ending==='toolbar')await page.locator('button').filter({has:page.locator('svg.lucide-undo')}).click()
  else await page.keyboard.press('Control+z')
  expect((await snap()).position).toEqual(before.position)
  if(ending==='toolbar'){await page.locator('button').filter({has:page.locator('svg.lucide-redo')}).click();expect((await snap()).position).toEqual(live.position)}
  if(ending==='view')expect((await snap()).view).toBe('3d')
 }
 console.log('GESTURE_LIFECYCLE',ending,JSON.stringify({before,live,after}))
 if(ending==='blur'){
  const saved=page.waitForResponse(r=>r.url().endsWith('/designs/save')&&r.request().method()==='POST');await page.getByRole('button',{name:'Save',exact:true}).click();expect((await saved).status()).toBe(200)
  await page.waitForFunction(()=>new URL(location.href).searchParams.has('sessionId'));await page.reload();await page.waitForFunction(()=>(window as any).__editorStore?.getState().layers.some((l:any)=>l.id==='gesture'));expect(await page.evaluate(()=>(window as any).__editorStore.getState().layers.find((l:any)=>l.id==='gesture').position)).toEqual(before.position)
 }
})
