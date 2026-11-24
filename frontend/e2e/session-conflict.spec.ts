import {test,expect} from '@playwright/test';
for(const language of ['en','ar'])for(const width of [1280,320,360,390])test(`synthetic session conflict retains local artwork and allows explicit retry ${language} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:800});
 await page.addInitScript(l=>localStorage.setItem('language',l),language);
 let creates=0,saves=0;let saved:any;
 await page.route('**/api/designs/session',async route=>{creates++;if(creates===1)await route.fulfill({status:409,json:{success:false,error:'CONFLICT',message:'Design session changed concurrently; retry'}});else await route.fulfill({json:{success:true,data:{sessionId:'synthetic-retry-session'}}})});
 await page.route('**/api/designs/save',async route=>{saves++;saved=route.request().postDataJSON();await route.fulfill({json:{success:true,data:{id:'synthetic-design'}}})});
 await page.goto('/editor?editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore);
 await page.evaluate(()=>{const store=(window as any).__editorStore;store.getState().applyCoreState((c:any)=>({...c,layers:[...c.layers,{id:'retained-conflict-probe',type:'text',faceId:'front',name:'Synthetic retained artwork',text:'KEEP MY ART',position:{x:20,y:20},size:{width:60,height:20},rotation:0,opacity:1,visible:true,locked:false}]}))});
 const before=await page.evaluate(()=>JSON.stringify((window as any).__editorStore.getState().history.present));
 await page.locator('button[data-save-status]').click();const alert=page.getByRole('alert').filter({hasText:language==='ar'?'تعارض في الحفظ':'Save conflict'});await expect(alert).toBeVisible();expect(creates).toBe(1);expect(saves).toBe(0);await expect(page.locator('button[data-save-status]')).toBeEnabled();
 expect(await page.evaluate(()=>JSON.stringify((window as any).__editorStore.getState().history.present))).toBe(before);
 const local=await page.evaluate(async()=>new Promise<any>((resolve,reject)=>{const r=indexedDB.open('packagepro-editor',1);r.onsuccess=()=>{const q=r.result.transaction('designs').objectStore('designs').get('current-design');q.onsuccess=()=>resolve(q.result);q.onerror=reject};r.onerror=reject}));expect(local.state.layers.some((l:any)=>l.id==='retained-conflict-probe')).toBe(true);
 const box=await alert.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
 await page.screenshot({path:info.outputPath(`session-conflict-${language}-${width}.png`),fullPage:true});
 await alert.getByRole('button').click();await expect(alert).toHaveCount(0);expect(creates).toBe(2);expect(saves).toBe(1);expect(saved.designData.layers.some((l:any)=>l.id==='retained-conflict-probe')).toBe(true);
});
for(const language of ['en','ar'])for(const mode of ['local-after-conflict','cloud500'])test(`truthful manual save ${mode} ${language}`,async({page},info)=>{
 await page.setViewportSize({width:390,height:800});await page.addInitScript(l=>localStorage.setItem('language',l),language);
 let creates=0,saves=0;
 await page.route('**/api/designs/session',async route=>{creates++;await route.fulfill(creates===1?{status:mode==='cloud500'?500:409,json:{success:false,error:'SYNTHETIC'}}:{json:{success:true,data:{sessionId:'synthetic-recovered'}}})});
 await page.route('**/api/designs/save',async route=>{saves++;await route.fulfill({json:{success:true,data:{}}})});
 await page.goto('/editor?editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore);
 await page.evaluate(()=>{const s=(window as any).__editorStore;s.getState().applyCoreState((c:any)=>({...c,layers:[...c.layers,{id:'latest-artwork',type:'text',faceId:'front',name:'Latest artwork',text:'KEEP',position:{x:10,y:10},size:{width:50,height:20},rotation:0,opacity:1,visible:true,locked:false}]}))});
 await page.locator('button[data-save-status]').click();const alert=page.getByRole('alert').filter({has:page.getByRole('button')});await expect(alert).toContainText(language==='ar'?(mode==='cloud500'?'تعذر الحفظ على الحساب':'تعارض في الحفظ'):(mode==='cloud500'?'Cloud save failed':'Save conflict'));
 if(mode==='local-after-conflict'){
  await page.evaluate(()=>{const w=window as any;w.__originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Synthetic local write failure','QuotaExceededError')}});
  await alert.getByRole('button').click();await expect(alert).toContainText(language==='ar'?'تعذر حفظ التغييرات الأخيرة':'Latest changes could not be saved');await expect(alert).not.toContainText(language==='ar'?'تم حفظ نسخة':'A copy is saved');expect(creates).toBe(1);expect(saves).toBe(0);
 }
 await expect(page.locator('button[data-save-status]')).toBeEnabled();expect(await page.evaluate(()=>(window as any).__editorStore.getState().history.present.layers.some((l:any)=>l.id==='latest-artwork'))).toBe(true);
 await page.screenshot({path:info.outputPath(`${mode}-${language}.png`),fullPage:true});
 if(mode==='local-after-conflict')await page.evaluate(()=>{IDBObjectStore.prototype.put=(window as any).__originalPut});
 await alert.getByRole('button').click();await expect(alert).toHaveCount(0);expect(creates).toBe(2);expect(saves).toBe(1);
});
