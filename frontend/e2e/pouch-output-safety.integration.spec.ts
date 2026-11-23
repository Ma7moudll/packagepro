import {test,expect} from './local-customer-fixture'
import {loginViaApi} from './helpers'
test('saved unsupported pouch artwork remains recoverable while reference and design outputs refuse it',async({page,localCustomer})=>{
 await loginViaApi(page,localCustomer.email)
 await page.goto('/editor?product=custom-stand-up-pouch&editorDebug=1')
 await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-stand-up-pouch')
 await page.evaluate(()=>{const s=(window as any).__editorStore;s.getState().addLayer({id:'pouch-side',type:'text',faceId:'left',name:'Preserved side',position:{x:60,y:130},textProperties:{content:'PRESERVED SIDE',fontFamily:'Arial',fontSize:16,fontWeight:700,color:'#b02030',align:'left',letterSpacing:0,lineHeight:1}})})
 await expect(page.locator('[data-unsupported-artwork-warning]')).toBeVisible()
 const saved=page.waitForResponse(r=>r.url().endsWith('/designs/save')&&r.request().method()==='POST');await page.getByRole('button',{name:'Save',exact:true}).click();expect((await saved).status()).toBe(200)
 await page.waitForFunction(()=>new URL(location.href).searchParams.has('sessionId'));await page.reload()
 await page.waitForFunction(()=>(window as any).__editorStore?.getState().layers.some((l:any)=>l.id==='pouch-side'&&l.faceId==='left'))
 await expect(page.locator('[data-unsupported-artwork-warning]')).toBeVisible()
 await page.locator('[data-unsupported-artwork-warning]').getByRole('button',{name:'Details',exact:true}).click()
 await expect(page.getByText(/Only front and back artwork are mapped/)).toBeVisible();await page.keyboard.press('Escape')
 await page.evaluate(()=>{(window as any).__pouchStore=(window as any).__editorStore;(window as any).__editorSetViewMode('2d')});await page.getByRole('button',{name:'Left',exact:true}).click()
 await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='pouch-side'))
 const downloads:string[]=[];page.on('download',d=>downloads.push(d.suggestedFilename()))
 await page.getByTitle('Download current face (PNG reference)',{exact:true}).click();await expect(page.getByText('Download blocked. See the artwork warning above.',{exact:true})).toBeVisible()
 await page.screenshot({animations:'disabled',path:'/downloads/pouch-warning-reloaded-2d.png'})
 await page.getByRole('tab',{name:'Export',exact:true}).click();await page.getByRole('button',{name:'Export',exact:true}).click()
 const dialog=page.locator('[data-preview-export-dialog]');await expect(dialog).toBeVisible()
 for(const format of ['PDF','SVG','PNG','JPEG']){
  await dialog.locator('[data-preview-format]').click();await page.getByRole('option',{name:new RegExp('^'+format+' ')}).click()
  await dialog.locator('[data-preview-export]').click();await expect(dialog.getByText(/Export blocked: This stand-up pouch/)).toBeVisible()
 }
 expect(downloads).toEqual([])
 await page.keyboard.press('Escape')
 // A real UI deletion recovers output eligibility; undo restores the data and block.
 await page.getByRole('tab',{name:'Design',exact:true}).click()
 await page.evaluate(()=>{const c=(window as any).__fabricCanvas;const o=c.getObjects().find((o:any)=>o.layerId==='pouch-side');const p=o.getCenterPoint();const r=c.upperCanvasEl.getBoundingClientRect();(window as any).__pouchPoint={x:r.x+p.x*r.width/c.width,y:r.y+p.y*r.height/c.height}})
 const point=await page.evaluate(()=>(window as any).__pouchPoint);await page.mouse.click(point.x,point.y)
 await expect.poll(()=>page.evaluate(()=>(window as any).__pouchStore.getState().selectedLayerIds)).toContain('pouch-side')
 await page.keyboard.press('Delete');await expect(page.locator('[data-unsupported-artwork-warning]')).toHaveCount(0)
 await page.keyboard.press('Control+z');await expect(page.locator('[data-unsupported-artwork-warning]')).toBeVisible()
 // Existing face controls remain reachable; an explicit state-level move is separate coverage.

 await page.evaluate(()=>{const s=(window as any).__pouchStore;s.getState().updateLayer('pouch-side',(l:any)=>({...l,faceId:'front'}));s.getState().setSelectedFace('front');(window as any).__editorSetViewMode('2d')})
 await expect(page.locator('[data-unsupported-artwork-warning]')).toHaveCount(0)
 await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='pouch-side'))
 const download=page.waitForEvent('download');await page.getByTitle('Download current face (PNG reference)',{exact:true}).click();expect((await download).suggestedFilename()).toBe('design.png')
})
for(const language of ['en','ar'])test(`pouch unsupported artwork warning remains reachable at320 ${language}`,async({page,localCustomer})=>{
 await page.setViewportSize({width:320,height:800});await loginViaApi(page,localCustomer.email);await page.evaluate(lang=>localStorage.setItem('language',lang),language)
 await page.goto('/editor?product=custom-stand-up-pouch&editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-stand-up-pouch')
 await page.waitForFunction(()=>(window as any).__editorStore?.getState().history.present.model.type==='stand_up_pouch');await page.evaluate(()=>{(window as any).__pouchStore=(window as any).__editorStore;(window as any).__pouchStore.getState().addLayer({id:'side-mobile',faceId:'left',type:'text',name:'Saved side',textProperties:{content:'SIDE',fontSize:18,fontFamily:'Arial',fontWeight:400,color:'#333',align:'left',letterSpacing:0,lineHeight:1}})})
 const warning=page.locator('[data-unsupported-artwork-warning]');await expect(warning).toBeVisible();const b=await warning.boundingBox();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(320)
 await warning.getByRole('button',{name:'Details',exact:true}).click();await expect(page.getByText(/Only front and back artwork are mapped/)).toBeVisible();await page.screenshot({animations:'disabled',path:`/downloads/pouch-warning-${language}-320.png`})
})
