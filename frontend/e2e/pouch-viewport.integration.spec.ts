import {test,expect} from './local-customer-fixture'
import {loginViaApi} from './helpers'
import {readFile} from 'node:fs/promises'
for(const language of ['en','ar'])for(const width of [320,360,390,1280])test(`pouch display fit preserves edge artwork editing and logical saved/output coordinates ${language} ${width}`,async({page,localCustomer},testInfo)=>{
 await loginViaApi(page,localCustomer.email)
 await page.addInitScript(lang=>{localStorage.setItem('language',lang);document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.documentElement.lang=lang},language)
 await page.setViewportSize({width,height:800})
 await page.goto('/editor?product=custom-stand-up-pouch&editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-stand-up-pouch')
 await page.evaluate(()=>{const st=(window as any).__editorStore;(window as any).__fitStore=st;for(const [id,y] of [['top',45],['bottom',600]] as const)st.getState().addLayer({id,type:'text',faceId:'front',name:id,position:{x:150,y},textProperties:{content:id==='top'?'TOP >':'BOTTOM >',fontFamily:'Arial',fontSize:24,fontWeight:700,color:'#174e32',align:'left',letterSpacing:0,lineHeight:1}});(window as any).__editorSetViewMode('2d')})
 await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='bottom'))
  await expect.poll(async()=>{const s=await page.locator('[data-sheet-surface]').boundingBox(),v=await page.locator('[data-sheet-viewport]').boundingBox();return !!s&&!!v&&s.x>=v.x&&s.y>=v.y&&s.x+s.width<=v.x+v.width+1&&s.y+s.height<=v.y+v.height+1}).toBe(true)
  expect(await page.evaluate(()=>(window as any).__fitStore.getState().canvas)).toMatchObject({width:450,height:660})
  for(const id of ['top','bottom']){
   await page.evaluate(()=>(window as any).__fitStore.getState().setViewMode('2d'));await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='bottom'))
   const before=await page.evaluate(id=>(window as any).__fitStore.getState().layers.find((l:any)=>l.id===id).position,id)
   const historyBefore=await page.evaluate(()=>(window as any).__fitStore.getState().history.past.length)
   const point=await page.evaluate(id=>{const c=(window as any).__fabricCanvas,o=c.getObjects().find((o:any)=>o.layerId===id),p=o.getCenterPoint(),v=c.viewportTransform,r=c.upperCanvasEl.getBoundingClientRect();return {x:r.x+(p.x*v[0]+v[4])*r.width/c.width,y:r.y+(p.y*v[3]+v[5])*r.height/c.height,expectedDx:12*c.width/r.width/v[0],expectedDy:-8*c.height/r.height/v[3]}},id)
   expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS')
   await page.mouse.click(point.x,point.y);await expect.poll(()=>page.evaluate(()=>(window as any).__fitStore.getState().selectedLayerIds)).toContain(id)
   await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+12,point.y-8,{steps:8});await page.mouse.up()
   await expect.poll(()=>page.evaluate(id=>(window as any).__fitStore.getState().layers.find((l:any)=>l.id===id).position.x,id)).toBeGreaterThan(before.x+5)
   const after=await page.evaluate(id=>(window as any).__fitStore.getState().layers.find((l:any)=>l.id===id).position,id)
   // Allow one logical pixel for browser pointer rounding. The expected
   // delta uses the measured CSS rectangle, actual viewport zoom and the
   // unchanged logical Fabric dimensions, not the display-fit formula.
   expect(Math.abs((after.x-before.x)-point.expectedDx)).toBeLessThanOrEqual(1)
   expect(Math.abs((after.y-before.y)-point.expectedDy)).toBeLessThanOrEqual(1)
   console.log('POUCH_POINTER_MAPPING',language,width,id,{expected:[point.expectedDx,point.expectedDy],actual:[after.x-before.x,after.y-before.y]})
   // Undo is deliberately not treated as whole-gesture recovery: existing
   // Fabric moving/modified events record multiple history entries.
   const historyAfter=await page.evaluate(()=>(window as any).__fitStore.getState().history.past.length)
   expect(historyAfter).toBeGreaterThan(historyBefore)
  }
  await page.evaluate(()=>(window as any).__fitStore.getState().setViewMode('2d'));await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='bottom'));await page.mouse.click(4,400);await page.screenshot({animations:'disabled',path:testInfo.outputPath(`pouch-fit-${language}-${width}.png`)})
 // PostgreSQL JSON numeric serialization may change only the last float digits.
 const snapshot=()=>page.evaluate(()=>(window as any).__fitStore.getState().layers.map((l:any)=>({id:l.id,faceId:l.faceId,position:{x:Number(l.position.x.toFixed(8)),y:Number(l.position.y.toFixed(8))}})))
 const beforeSave=await snapshot();const saved=page.waitForResponse(r=>r.url().endsWith('/designs/save')&&r.request().method()==='POST');await page.getByRole('button',{name:language==='ar'?'حفظ':'Save',exact:true}).click();expect((await saved).status()).toBe(200)
 await page.waitForFunction(()=>new URL(location.href).searchParams.has('sessionId'));await page.reload();await page.waitForFunction(()=>(window as any).__editorStore?.getState().layers.some((l:any)=>l.id==='bottom'));await page.evaluate(()=>{(window as any).__fitStore=(window as any).__editorStore;(window as any).__editorSetViewMode('2d')});expect(await snapshot()).toEqual(beforeSave)
 await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='bottom'))
 const downloaded=page.waitForEvent('download');await page.getByTitle(language==='ar'?'تنزيل الوجه الحالي (مرجع PNG)':'Download current face (PNG reference)',{exact:true}).click();const download=await downloaded,bytes=await readFile((await download.path())!);expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([900,1320])
 await page.evaluate(()=>(window as any).__fitStore.getState().addLayer({id:'preserved-side',type:'text',faceId:'left',name:'side',textProperties:{content:'SIDE',fontFamily:'Arial',fontSize:18,fontWeight:400,color:'#333333',align:'left',letterSpacing:0,lineHeight:1}}));await page.evaluate(()=>(window as any).__fitStore.getState().setViewMode('2d'));await page.waitForFunction(()=>!!(window as any).__fabricCanvas);await page.getByTitle(language==='ar'?'تنزيل الوجه الحالي (مرجع PNG)':'Download current face (PNG reference)',{exact:true}).click();await expect(page.locator('[role=alert]').filter({hasText:/Download blocked|التنزيل/})).toBeVisible()
})
