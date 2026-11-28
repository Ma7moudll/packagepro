import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
const fixture=JSON.parse(readFileSync('../backend/src/modules/designs/fixtures/f42-artwork-review.json','utf8'))
for(const [language,width] of [['en',1280],['ar',320]] as const) test(`real scene capture pixels and stale guards ${language} ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:800})
  await page.addInitScript(l=>localStorage.setItem('language',l),language)
  await page.goto('/editor?editorDebug=1')
  await page.waitForFunction(()=>typeof (window as any).__editor3DFaces==='function'&&(window as any).__editor3DFaces().length>0)
  await page.evaluate(f=>{const w=window as any;w.__editorSpinBox.active=false;w.__editorSpinBox.yOverride=.4;w.__editorStore.getState().applyCoreState((s:any)=>({...s,layers:f.layers,model:{...s.model,dimensions:f.model.dimensions,faces:f.model.faces}}))},fixture)
  const ar=language==='ar'
  if(width<1280){await page.getByRole('button',{name:ar?'المزيد':'More',exact:true}).click();await page.getByRole('menuitem',{name:ar?'معاينة Mockup':'Mockup Preview'}).click()}
  else await page.locator('header').getByRole('button',{name:'Mockup Preview'}).click()
  const capture=page.getByRole('button',{name:ar?'التقاط العرض الحالي':'Capture current view',exact:true})
  const download=page.getByRole('button',{name:ar?'تنزيل PNG للمشهد':'Download scene PNG',exact:true})
  await expect(download).toBeDisabled()
  await expect(async()=>{await capture.click();await expect(download).toBeEnabled({timeout:12000})}).toPass({timeout:25000})
  const result=page.waitForEvent('download');await download.click();const path=info.outputPath('actual-scene.png');await(await result).saveAs(path)
  const bytes=readFileSync(path);expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a')
  const size=await page.locator('canvas').first().evaluate((e:HTMLCanvasElement)=>({w:e.width,h:e.height}))
  expect(bytes.readUInt32BE(16)).toBe(size.w);expect(bytes.readUInt32BE(20)).toBe(size.h)
  const source=await page.locator('[data-scene-preview]').getAttribute('src')
  const colors=await page.evaluate(async src=>{const image=await createImageBitmap(await(await fetch(src!)).blob());const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let ink=0,board=0;for(let i=0;i<d.length;i+=4){if(d[i]>d[i+1]*1.4&&d[i]>d[i+2]*1.2)ink++;if(d[i]>d[i+1]&&d[i+1]>d[i+2]&&d[i]>70)board++}return{ink,board}},source)
  expect(colors.ink).toBeGreaterThan(20);expect(colors.board).toBeGreaterThan(1000)
  const close=page.getByRole('dialog').locator('[data-slot=dialog-close]')
  await expect(close).toBeVisible()
  expect(await close.evaluate(b=>{const r=b.getBoundingClientRect();return r.width>=24&&r.height>=24&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b})).toBe(true)
  await page.locator('[data-scene-body]').evaluate(e=>{e.scrollTop=0})
  await page.screenshot({path:info.outputPath('capture-dialog.png'),animations:'disabled'})
  await page.setViewportSize({width,height:568})
  // Capture actions stay outside the scrolling preview. A resize can reset
  // the body scroll offset after a prior scroll-to-bottom, so neither action
  // may depend on that offset (or on repeated scrolling retries).
  for (const bottom of [false, true, false]) {
    await page.locator('[data-scene-body]').evaluate((e,bottom)=>{e.scrollTop=bottom?e.scrollHeight:0},bottom)
    for (const action of [capture, download]) {
      await expect(action).toBeInViewport()
      expect(await action.evaluate(b=>{const r=b.getBoundingClientRect();return r.width>=24&&r.height>=24&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b})).toBe(true)
    }
  }
  const closeBox=await close.boundingBox();const titleBox=await page.getByRole('dialog').getByRole('heading').boundingBox()
  expect(closeBox!.y).toBeGreaterThanOrEqual(0)
  expect(closeBox!.x+closeBox!.width).toBeLessThanOrEqual(titleBox!.x+40)
  await page.screenshot({path:info.outputPath('capture-short-scrolled.png'),animations:'disabled'})
  await close.click();await expect(page.getByRole('dialog')).toBeHidden()
  await page.setViewportSize({width,height:800})
  if(width<1280){await page.getByRole('button',{name:ar?'المزيد':'More',exact:true}).click();await page.getByRole('menuitem',{name:ar?'معاينة Mockup':'Mockup Preview'}).click()}
  else await page.locator('header').getByRole('button',{name:'Mockup Preview'}).click()
  await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:s.layers.map((l:any)=>l.type==='text'?{...l,textProperties:{...l.textProperties,content:'LATEST ARTWORK'}}:l)}))})
  await expect(download).toBeDisabled();await expect(page.getByRole('alert')).toContainText(ar?'تغير التصميم':'The design changed')
  await expect(async()=>{await capture.click();await expect(download).toBeEnabled({timeout:12000})}).toPass({timeout:25000})
  expect(await page.locator('[data-scene-preview]').getAttribute('src')).not.toBe(source)
  await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:[{...s.layers[0],type:'image',imageProperties:{src:'data:image/png;base64,YQ=='}}]}))})
  await capture.click();await expect(page.getByRole('alert')).toBeVisible();await expect(download).toBeDisabled();await expect(page.locator('[data-scene-preview]')).toHaveCount(0)
})

test('scene capture blocks unsupported models and missing 3D view',async({page})=>{
 await page.goto('/editor?editorDebug=1')
 await page.waitForFunction(()=>typeof (window as any).__editor3DFaces==='function'&&(window as any).__editor3DFaces().length>0)
 await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,model:{...s.model,type:'shipping_box'}}))})
 await page.locator('header').getByRole('button',{name:'Mockup Preview'}).click()
 await page.getByRole('button',{name:'Capture current view',exact:true}).click()
 await expect(page.getByRole('alert')).toBeVisible()
 await expect(page.getByRole('button',{name:'Download scene PNG'})).toBeDisabled()
 await page.getByRole('dialog').locator('[data-slot=dialog-close]').click()
 await page.evaluate(()=>(window as any).__editorSetViewMode('2d'))
 await page.waitForFunction(()=>!!(window as any).__fabricCanvas)
 await page.locator('header').getByRole('button',{name:'Mockup Preview'}).click()
 await page.getByRole('button',{name:'Capture current view',exact:true}).click()
 await expect(page.getByRole('alert')).toBeVisible()
 await expect(page.getByRole('button',{name:'Download scene PNG'})).toBeDisabled()
})

test('scene captures current stock and blocks lost WebGL context',async({page},info)=>{
 await page.goto('/editor?editorDebug=1')
 await page.waitForFunction(()=>typeof (window as any).__editor3DFaces==='function'&&(window as any).__editor3DFaces().length>0)
 await page.evaluate(()=>{(window as any).__editorSpinBox.active=false;(window as any).__editorSpinBox.yOverride=.4})
 await page.locator('header').getByRole('button',{name:'Mockup Preview'}).click()
 const capture=page.getByRole('button',{name:'Capture current view',exact:true}),download=page.getByRole('button',{name:'Download scene PNG'})
 const means:number[]=[]
 for(const material of ['cardboard-natural','cardboard-white-imported']){
   await page.evaluate(material=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:[],model:{...s.model,material}}))},material)
   await expect(download).toBeDisabled()
   await expect(async()=>{await capture.click();await expect(download).toBeEnabled({timeout:12000})}).toPass({timeout:25000})
   means.push(await page.locator('[data-scene-preview]').evaluate(async(img:HTMLImageElement)=>{const b=await createImageBitmap(await(await fetch(img.src)).blob());const c=document.createElement('canvas');c.width=b.width;c.height=b.height;const ctx=c.getContext('2d')!;ctx.drawImage(b,0,0);const data=ctx.getImageData(Math.floor(c.width*.4),Math.floor(c.height*.45),Math.max(1,Math.floor(c.width*.2)),Math.max(1,Math.floor(c.height*.1))).data;let n=0;for(let i=0;i<data.length;i+=4)n+=(data[i]+data[i+1]+data[i+2])/3;return n/(data.length/4)}))
   const d=page.waitForEvent('download');await download.click();await(await d).saveAs(info.outputPath(`${material}.png`))
 }
 expect(means[1]).toBeGreaterThan(means[0]+5)
 await page.locator('canvas').first().evaluate((c:HTMLCanvasElement)=>{const gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)throw Error('WebGL unavailable');const extension=gl.getExtension('WEBGL_lose_context');if(!extension)throw Error('Context loss extension unavailable');extension.loseContext()})
 await capture.click();await expect(page.getByRole('alert')).toBeVisible();await expect(download).toBeDisabled()
})

test('opening target rejects moving pose then permits settled capture',async({page})=>{
 await page.goto('/editor?editorDebug=1')
 await page.waitForFunction(()=>typeof (window as any).__editor3DFaces==='function'&&(window as any).__editor3DFaces().length>0)
 await page.evaluate(()=>{(window as any).__editorSpinBox.active=false})
 await page.locator('header').getByRole('button',{name:'Mockup Preview'}).click()
 await page.evaluate(()=>{(window as any).__editorStore.getState().setBoxOpenState(1);const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Capture current view');b?.click()})
 await expect(page.getByRole('alert')).toBeVisible()
 const download=page.getByRole('button',{name:'Download scene PNG'})
 await expect(download).toBeDisabled()
 await expect(async()=>{await page.getByRole('button',{name:'Capture current view',exact:true}).click();await expect(download).toBeEnabled({timeout:2000})}).toPass({timeout:20000})
})
