import {test,expect} from './local-customer-fixture'
import {loginViaApi,BACKEND} from './helpers'

test('thank-you catalogue sheet preserves both artwork faces, dimensions and requested stock on real save/reopen',async({page,localCustomer},testInfo)=>{
 await loginViaApi(page,localCustomer.email)
 const response=await page.request.get(BACKEND+'/catalog/custom-thank-you-card/editor-config');expect(response.ok()).toBe(true)
 const config=(await response.json()).data
 expect(Object.keys(config.product.structure.faces).sort()).toEqual(['back','front'])
 expect(config.material).toMatchObject({code:'card-stock-white',hex:'#e9ecef'})
 expect(config.product.readiness).toMatchObject({preview:'in_progress',dieline:'deferred',pricing:'quote_required'})
 expect(config.product.dieline).toBeUndefined()
 await page.goto('/editor?product=custom-thank-you-card&editorDebug=1')
 await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-thank-you-card')
 const state=()=>page.evaluate(()=>{const s=((window as any).__editorStore||(window as any).__st).getState();return {faces:s.model.faces.map((f:any)=>f.id),dimensions:s.model.dimensions,material:s.model.material,bg:s.canvas.backgroundColor,canvas:[s.canvas.width,s.canvas.height],layers:s.layers.map((l:any)=>({id:l.id,faceId:l.faceId,text:l.textProperties?.content}))}})
 expect(await state()).toMatchObject({faces:['front','back'],dimensions:{length:100,width:1,height:150},bg:'#e9ecef',canvas:[300,450]})
 await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:['front','back'].map((faceId,i)=>({id:'thankyou-'+faceId,name:faceId,type:'text',faceId,visible:true,locked:false,opacity:1,blendMode:'normal',rotation:0,position:{x:40,y:60},scale:{x:1,y:1},textProperties:{content:i?'BACK 2 >':'FRONT 1 >',fontFamily:'Arial',fontSize:25,fontWeight:700,color:i?'#b02030':'#174e32',align:'left',letterSpacing:0,lineHeight:1}})),selectedLayerIds:[],model:{...s.model,dimensions:{length:120,width:1,height:180}}}))})
 await expect.poll(async()=>(await state()).canvas).toEqual([360,540])
 // Change stock through the real control. Exact labels distinguish card stocks.
 await page.getByText('Material',{exact:true}).click()
 await page.locator('#product-material-candidate').selectOption('card-stock-kraft')
 await expect.poll(async()=>(await state()).material).toBe('card-stock-kraft')
 expect((await state()).bg).toBe('#a8855a')
 const saved=page.waitForResponse(r=>r.url().endsWith('/designs/save')&&r.request().method()==='POST')
 await page.getByRole('button',{name:'Save',exact:true}).click();expect((await saved).status()).toBe(200)
 await page.waitForFunction(()=>new URL(location.href).searchParams.has('sessionId'))
 const sid=new URL(page.url()).searchParams.get('sessionId')!
 const cloud=await page.request.get(BACKEND+'/designs/session/'+sid,{headers:{Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('accessToken'))}});expect(cloud.ok()).toBe(true)
 const data=(await cloud.json()).data.designData
 expect(data.layers.map((l:any)=>l.textProperties.content)).toEqual(['FRONT 1 >','BACK 2 >'])
 expect(data.model.dimensions).toEqual({length:120,width:1,height:180})
 await page.reload();await page.waitForFunction(()=>(window as any).__editorStore?.getState().layers.some((l:any)=>l.id==='thankyou-back'))
 expect(await state()).toMatchObject({faces:['front','back'],dimensions:{length:120,width:1,height:180},material:'card-stock-kraft',bg:'#a8855a',canvas:[360,540]})
 await page.screenshot({path:testInfo.outputPath('thank-you-restored.png')})
 await page.evaluate(()=>{(window as any).__st=(window as any).__editorStore})
 // Guard does not discard an unsupported restored face's artwork.
 await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:[...s.layers,{...s.layers[0],id:'preserved-inside',faceId:'inside_front'}]}));(window as any).__editorSetViewMode('2d')})
 await expect(page.locator('[data-unsupported-artwork-warning]')).toBeVisible()
 expect((await state()).layers.some((l:any)=>l.id==='preserved-inside'&&l.faceId==='inside_front')).toBe(true)
})
