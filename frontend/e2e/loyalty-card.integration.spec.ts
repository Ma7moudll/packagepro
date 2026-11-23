import {test,expect} from './local-customer-fixture'
import {loginViaApi,BACKEND} from './helpers'

test('loyalty catalogue sheet preserves both artwork faces, dimensions and requested stock on real save/reopen',async({page,localCustomer},testInfo)=>{
 await loginViaApi(page,localCustomer.email)
 const response=await page.request.get(BACKEND+'/catalog/custom-loyalty-card/editor-config');expect(response.ok()).toBe(true)
 const config=(await response.json()).data
 expect(Object.keys(config.product.structure.faces).sort()).toEqual(['back','front'])
 expect(config.material).toMatchObject({code:'card-stock-white',hex:'#e9ecef'})
 expect(config.product.readiness).toMatchObject({preview:'in_progress',dieline:'deferred',pricing:'quote_required'})
 expect(config.product.dieline).toBeUndefined()
 await page.goto('/editor?product=custom-loyalty-card&editorDebug=1')
 await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-loyalty-card')
 const state=()=>page.evaluate(()=>{const s=((window as any).__editorStore||(window as any).__st).getState();return {faces:s.model.faces.map((f:any)=>f.id),dimensions:s.model.dimensions,material:s.model.material,bg:s.canvas.backgroundColor,canvas:[s.canvas.width,s.canvas.height],layers:s.layers.map((l:any)=>({id:l.id,faceId:l.faceId,text:l.textProperties?.content}))}})
 expect(await state()).toMatchObject({faces:['front','back'],dimensions:{length:85,width:1,height:55},bg:'#e9ecef',canvas:[255,165]})
 await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:['front','back'].map((faceId,i)=>({id:'loyalty-'+faceId,name:faceId,type:'text',faceId,visible:true,locked:false,opacity:1,blendMode:'normal',rotation:0,position:{x:140,y:70},scale:{x:1,y:1},textProperties:{content:i?'BACK 2 >':'FRONT 1 >',fontFamily:'Arial',fontSize:18,fontWeight:700,color:i?'#b02030':'#174e32',align:'left',letterSpacing:0,lineHeight:1}})),selectedLayerIds:[],model:{...s.model,dimensions:{length:100,width:1,height:65}}}))})
 await expect.poll(async()=>(await state()).canvas).toEqual([300,195])
 // Only the real seeded white stock is selectable; no new commercial stock.
 await page.getByText('Material',{exact:true}).click()
 expect(config.product.candidateMaterials).toEqual(['card-stock-white'])
 await expect(page.locator('#product-material-candidate')).toHaveValue('card-stock-white')
 const saved=page.waitForResponse(r=>r.url().endsWith('/designs/save')&&r.request().method()==='POST')
 await page.getByRole('button',{name:'Save',exact:true}).click();expect((await saved).status()).toBe(200)
 await page.waitForFunction(()=>new URL(location.href).searchParams.has('sessionId'))
 const sid=new URL(page.url()).searchParams.get('sessionId')!
 const cloud=await page.request.get(BACKEND+'/designs/session/'+sid,{headers:{Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('accessToken'))}});expect(cloud.ok()).toBe(true)
 const data=(await cloud.json()).data.designData
 expect(data.layers.map((l:any)=>l.textProperties.content)).toEqual(['FRONT 1 >','BACK 2 >'])
 expect(data.model.dimensions).toEqual({length:100,width:1,height:65})
 await page.reload();await page.waitForFunction(()=>(window as any).__editorStore?.getState().layers.some((l:any)=>l.id==='loyalty-back'))
 expect(await state()).toMatchObject({faces:['front','back'],dimensions:{length:100,width:1,height:65},material:'card-stock-white',bg:'#e9ecef',canvas:[300,195]})
 await page.evaluate(()=>(window as any).__editorSetViewMode('2d'))
 await page.waitForFunction(()=>!!(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='loyalty-front'))
 await page.locator('body').click({position:{x:4,y:400}});await page.screenshot({animations:'disabled',path:'/downloads/loyalty-after-2d.png'})
 await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.getByRole('button',{name:'Back',exact:true})).toHaveClass(/bg-slate-900/);await expect(page.getByRole('button',{name:'Front',exact:true})).not.toHaveClass(/bg-slate-900/);await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='loyalty-back'));await page.locator('body').click({position:{x:4,y:400}});await page.screenshot({animations:'disabled',path:'/downloads/loyalty-after-back-2d.png'});await page.getByRole('button',{name:'Front',exact:true}).click()
 await page.evaluate(()=>(window as any).__editorSetViewMode('3d'))
 await page.waitForFunction(()=>(window as any).__editor3DFaces?.().some((f:any)=>f.faceId==='front'))
 await page.locator('body').click({position:{x:4,y:400}});await page.screenshot({animations:'disabled',path:'/downloads/loyalty-after-3d.png'})
 await page.evaluate(()=>{(window as any).__st=(window as any).__editorStore})
 // Guard does not discard an unsupported restored face's artwork.
 await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:[...s.layers,{...s.layers[0],id:'preserved-inside',faceId:'inside_front'}]}));(window as any).__editorSetViewMode('2d')})
 await expect(page.locator('[data-unsupported-artwork-warning]')).toBeVisible()
 expect((await state()).layers.some((l:any)=>l.id==='preserved-inside'&&l.faceId==='inside_front')).toBe(true)
 const saveInside=page.waitForResponse(r=>r.url().endsWith('/designs/save')&&r.request().method()==='POST');await page.getByRole('button',{name:'Save',exact:true}).click();expect((await saveInside).status()).toBe(200);await page.reload();await page.waitForFunction(()=>(window as any).__editorStore?.getState().layers.some((l:any)=>l.id==='preserved-inside'));await page.evaluate(()=>(window as any).__editorSetViewMode('2d'));await expect(page.locator('[data-unsupported-artwork-warning]')).toBeVisible()
 await page.getByTitle('Download current face (PNG reference)',{exact:true}).click();await expect(page.getByText('Download blocked. See the artwork warning above.',{exact:true})).toBeVisible()

})
for(const language of ['en','ar'])for(const width of [320,360,390,1280])test(`loyalty ${language} viewport ${width} has actual two-face sheet and reachable face controls`,async({page,localCustomer})=>{
 await page.setViewportSize({width,height:800});await loginViaApi(page,localCustomer.email);await page.evaluate(lang=>localStorage.setItem('language',lang),language)
 await page.goto('/editor?product=custom-loyalty-card&editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-loyalty-card')
 await page.evaluate(()=>{const st=(window as any).__editorStore;(window as any).__st=st;st.getState().applyCoreState((s:any)=>({...s,layers:[{id:'mobile-loyalty',name:'Mobile',type:'text',faceId:'front',visible:true,locked:false,opacity:1,blendMode:'normal',rotation:0,position:{x:125,y:75},scale:{x:1,y:1},textProperties:{content:'LOYALTY >',fontFamily:'Arial',fontSize:18,fontWeight:700,color:'#174e32',align:'center',letterSpacing:0,lineHeight:1}}]}));(window as any).__editorSetViewMode('2d')})
 await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().some((o:any)=>o.layerId==='mobile-loyalty'))
 // Use actual pointer events at the scaled Fabric object's screen position.
 const objectPoint=await page.evaluate(()=>{const c=(window as any).__fabricCanvas;const o=c.getObjects().find((o:any)=>o.layerId==='mobile-loyalty');const p=o.getCenterPoint();const v=c.viewportTransform;const r=c.upperCanvasEl.getBoundingClientRect();return {x:r.x+(p.x*v[0]+v[4])*r.width/c.width,y:r.y+(p.y*v[3]+v[5])*r.height/c.height}})
 await page.mouse.click(objectPoint.x,objectPoint.y)
 await expect.poll(()=>page.evaluate(()=>(window as any).__st.getState().selectedLayerIds)).toContain('mobile-loyalty')
 const beforeDrag=await page.evaluate(()=>(window as any).__st.getState().layers.find((l:any)=>l.id==='mobile-loyalty').position.x)
 await page.mouse.move(objectPoint.x,objectPoint.y);await page.mouse.down();await page.mouse.move(objectPoint.x+16,objectPoint.y+8,{steps:8});await page.mouse.up()
 await expect.poll(()=>page.evaluate(()=>(window as any).__st.getState().layers.find((l:any)=>l.id==='mobile-loyalty').position.x)).toBeGreaterThan(beforeDrag+5)
 const faces=await page.evaluate(()=>(window as any).__st.getState().model.faces.map((f:any)=>f.id));expect(faces).toEqual(['front','back'])
 const surface=await page.locator('[data-sheet-surface]').boundingBox();const view=await page.locator('[data-sheet-viewport]').boundingBox();expect(surface!.x).toBeGreaterThanOrEqual(view!.x);expect(surface!.x+surface!.width).toBeLessThanOrEqual(view!.x+view!.width);const back=page.getByRole('button',{name:'Back',exact:true});await back.scrollIntoViewIfNeeded();expect(await back.evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);await back.click();await expect(back).toHaveAttribute('aria-pressed','true');await expect.poll(()=>back.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(15, 23, 42)');await page.locator('body').click({position:{x:4,y:400}});await page.screenshot({animations:'disabled',path:`/downloads/loyalty-${language}-${width}-back.png`});await page.getByRole('button',{name:'Front',exact:true}).click();await expect(page.getByRole('button',{name:'Front',exact:true})).toHaveAttribute('aria-pressed','true');await expect.poll(()=>page.getByRole('button',{name:'Front',exact:true}).evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(15, 23, 42)');await page.locator('body').click({position:{x:4,y:400}});await page.screenshot({animations:'disabled',path:`/downloads/loyalty-${language}-${width}.png`})
})

test('layer edits preserve current selection without changing undo redo deletion or face selection policies',async({page,localCustomer})=>{
 await loginViaApi(page,localCustomer.email);await page.goto('/editor?product=custom-loyalty-card&editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-loyalty-card')
 const result=await page.evaluate(()=>{const st=(window as any).__editorStore;const s=()=>st.getState();s().applyCoreState((c:any)=>({...c,layers:['a','b'].map(id=>({id,type:'shape',faceId:'front',name:id,visible:true,locked:false,opacity:1,blendMode:'normal',rotation:0,position:{x:50,y:50},scale:{x:1,y:1},shapeProperties:{shape:'rect',fill:'#333'}})),selectedLayerIds:[]}));s().setSelectedLayers(['a','b']);s().updateLayer('a',(l:any)=>({...l,position:{x:75,y:50}}));const multi=[...s().selectedLayerIds];s().undo();const undoX=s().layers[0].position.x;s().redo();const redoX=s().layers[0].position.x;const redoSelection=[...s().selectedLayerIds];s().removeLayer('a');const afterDelete={layers:s().layers.map((l:any)=>l.id),selected:s().selectedLayerIds};s().setSelectedFace('back');return {multi,undoX,redoX,redoSelection,afterDelete,face:s().ui.selectedFace,selected:s().selectedLayerIds}})
 expect(result).toEqual({multi:['a','b'],undoX:50,redoX:75,redoSelection:['a','b'],afterDelete:{layers:['b'],selected:['b']},face:'back',selected:['b']})
})
