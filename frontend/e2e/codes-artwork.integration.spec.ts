import {test,expect} from './local-customer-fixture'
import {loginViaApi} from './helpers'
import {writeFile,readFile} from 'node:fs/promises'
import {PNG} from 'pngjs'
import {MultiFormatReader,BinaryBitmap,HybridBinarizer,RGBLuminanceSource} from '@zxing/library'
function decode(bytes:Buffer){
 const p=PNG.sync.read(bytes),lum=new Uint8ClampedArray(p.width*p.height)
 for(let i=0;i<lum.length;i++)lum[i]=(306*p.data[i*4]+601*p.data[i*4+1]+117*p.data[i*4+2])>>10
 const reader=new MultiFormatReader();reader.setHints(new Map());return reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum,p.width,p.height)))).getText()
}
function expectPayload(actual:string,payload:string,kind:string){
 // ZXing may report UPC-A as its identical EAN-13 representation.
 expect(kind==='upc'&&actual==='0'+payload?actual.slice(1):actual).toBe(payload)
}
for(const kind of ['qr','code128','code128long40','code128long80','ean13','upc'])test(`generated ${kind} artwork preserves exact payload through real save/reopen/currentface export`,async({page,localCustomer},info)=>{
 await loginViaApi(page,localCustomer.email);await page.goto('/editor?product=custom-loyalty-card&editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-loyalty-card');await page.evaluate(()=>{(window as any).__codesStore=(window as any).__editorStore;(window as any).__editorSetViewMode('2d')});await page.getByRole('tab',{name:'Tools',exact:true}).click()
 const payload=kind==='qr'?'مرحبا بالعالم 😀 https://example.com/a?x=1&y=2':kind.startsWith('code128')?(kind==='code128long40'?'AbC1'.repeat(10):kind==='code128long80'?'AbC1'.repeat(20):'  Abc-123  '):kind==='ean13'?'5901234123457':'036000291452'
 if(kind==='qr')await page.getByLabel('QR content',{exact:true}).fill(payload)
 else{await page.getByRole('tab',{name:'Barcode',exact:true}).click();await page.getByLabel('Barcode content',{exact:true}).fill(payload);if(!kind.startsWith('code128')){await page.getByRole('combobox',{name:'Barcode type',exact:true}).click();await page.getByRole('option',{name:kind==='ean13'?'EAN-13':'UPC-A',exact:true}).click()}}
 if(kind.startsWith('code128long')){
  // The seeded small card must refuse a symbol whose modules would collapse.
  await page.getByRole('button',{name:'Add Barcode',exact:true}).click();await expect(page.locator('[data-code-generators] [role=alert]')).toContainText('cannot fit this face');expect(await page.evaluate(()=>(window as any).__codesStore.getState().layers.length)).toBe(0)
  // Explicit large-face editing fixture, not a new catalogue geometry claim.
  await page.evaluate(()=>{const s=(window as any).__codesStore;s.getState().applyCoreState((c:any)=>({...c,model:{...c.model,dimensions:{...c.model.dimensions,length:1000,height:400}}}))})
  await expect.poll(()=>page.evaluate(()=>(window as any).__codesStore.getState().canvas.width)).toBe(3000)
 }
 await page.getByRole('button',{name:kind==='qr'?'Add QR Code':'Add Barcode',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__codesStore.getState().layers.length)).toBe(1)
 const snapshot=()=>page.evaluate(()=>{const l=(window as any).__codesStore.getState().layers[0];return {id:l.id,src:l.imageProperties.src,faceId:l.faceId}})
 const before=await snapshot();expectPayload(decode(Buffer.from(before.src.split(',')[1],'base64')),payload,kind);await writeFile(info.outputPath('generated.png'),Buffer.from(before.src.split(',')[1],'base64'));await writeFile(info.outputPath('payload.json'),JSON.stringify({kind,payload}));
 const saved=page.waitForResponse(r=>r.url().endsWith('/designs/save')&&r.request().method()==='POST');await page.getByRole('button',{name:'Save',exact:true}).click();expect((await saved).status()).toBe(200);await page.waitForFunction(()=>new URL(location.href).searchParams.has('sessionId'));await page.reload();await page.waitForFunction(()=>(window as any).__editorStore?.getState().layers.length===1);await page.evaluate(()=>{(window as any).__codesStore=(window as any).__editorStore;(window as any).__editorSetViewMode('2d')});expect(await snapshot()).toEqual(before)
 await page.waitForFunction(()=>(window as any).__fabricCanvas?.getObjects().length>0);const dl=page.waitForEvent('download');await page.getByTitle('Download current face (PNG reference)',{exact:true}).click();await (await dl).saveAs(info.outputPath('currentface.png'));expectPayload(decode(await readFile(info.outputPath('currentface.png'))),payload,kind);await page.screenshot({animations:'disabled',path:info.outputPath('editor.png')})
})
for(const language of ['en','ar'])test(`invalid code input creates no artwork and shows error ${language}`,async({page,localCustomer},info)=>{
 await loginViaApi(page,localCustomer.email);await page.addInitScript(lang=>{localStorage.setItem('language',lang);document.documentElement.dir=lang==='ar'?'rtl':'ltr'},language);await page.setViewportSize({width:390,height:800});await page.goto('/editor?product=custom-loyalty-card&editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-loyalty-card');await page.evaluate(()=>(window as any).__codesStore=(window as any).__editorStore);await page.getByRole('tab',{name:language==='ar'?'أدوات':'Tools',exact:true}).click();await page.getByRole('tab',{name:'Barcode',exact:true}).click()
 const input=page.getByLabel(language==='ar'?'محتوى الباركود':'Barcode content',{exact:true}),button=page.getByRole('button',{name:language==='ar'?'إضافة Barcode':'Add Barcode',exact:true});await input.fill('مرحبا');await button.click();await expect(page.locator('[data-code-generators] [role=alert]')).toBeVisible();expect(await page.evaluate(()=>(window as any).__codesStore.getState().layers.length)).toBe(0)
 await page.getByRole('combobox',{name:'Barcode type',exact:true}).click();await page.getByRole('option',{name:'EAN-13',exact:true}).click();await input.fill('5901234123458');await button.click();await expect(page.locator('[data-code-generators] [role=alert]')).toBeVisible();expect(await page.evaluate(()=>(window as any).__codesStore.getState().layers.length)).toBe(0);await page.locator('[data-code-generators] [role=alert]').scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:info.outputPath('invalid.png')})
})

for(const language of ['en','ar'])test(`invalid QR capacity and contrast create no layer ${language}`,async({page,localCustomer},info)=>{
 await loginViaApi(page,localCustomer.email);await page.addInitScript(lang=>{localStorage.setItem('language',lang);document.documentElement.dir=lang==='ar'?'rtl':'ltr'},language);await page.setViewportSize({width:390,height:800});await page.goto('/editor?product=custom-loyalty-card&editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-loyalty-card');await page.evaluate(()=>(window as any).__codesStore=(window as any).__editorStore);await page.getByRole('tab',{name:language==='ar'?'أدوات':'Tools',exact:true}).click()
 const input=page.getByLabel(language==='ar'?'محتوى QR':'QR content',{exact:true}),button=page.getByRole('button',{name:language==='ar'?'إضافة QR Code':'Add QR Code',exact:true})
 await input.fill('x'.repeat(4000));await button.click();await expect(page.locator('[data-code-generators] [role=alert]')).toBeVisible();expect(await page.evaluate(()=>(window as any).__codesStore.getState().layers.length)).toBe(0)
 await input.fill('Exact payload');await page.getByTitle(language==='ar'?'لون المقدمة':'Foreground',{exact:true}).fill('#ffffff');await button.click();await expect(page.locator('[data-code-generators] [role=alert]')).toBeVisible();expect(await page.evaluate(()=>(window as any).__codesStore.getState().layers.length)).toBe(0);await page.screenshot({animations:'disabled',path:info.outputPath('invalid-qr.png')})
})

test('code errors clear on relevant edits and tab switch',async({page,localCustomer})=>{
 await loginViaApi(page,localCustomer.email);await page.goto('/editor?product=custom-loyalty-card&editorDebug=1');await page.waitForFunction(()=>(window as any).__editorStore?.getState().product?.id==='prod-loyalty-card');await page.getByRole('tab',{name:'Tools',exact:true}).click()
 const panel=page.locator('[data-code-generators]'),alert=panel.locator('[role=alert]');await page.getByLabel('QR content',{exact:true}).fill('x'.repeat(4000));await page.getByRole('button',{name:'Add QR Code',exact:true}).click();await expect(alert).toBeVisible();await page.getByRole('tab',{name:'Barcode',exact:true}).click();await expect(alert).toHaveCount(0)
 await page.getByLabel('Barcode content',{exact:true}).fill('مرحبا');await page.getByRole('button',{name:'Add Barcode',exact:true}).click();await expect(alert).toBeVisible();await page.getByLabel('Barcode content',{exact:true}).fill('Valid');await expect(alert).toHaveCount(0)
 await page.getByLabel('Barcode content',{exact:true}).fill('مرحبا');await page.getByRole('button',{name:'Add Barcode',exact:true}).click();await page.getByRole('combobox',{name:'Barcode type',exact:true}).click();await page.getByRole('option',{name:'EAN-13',exact:true}).click();await expect(alert).toHaveCount(0)
 await page.getByRole('tab',{name:'QR Code',exact:true}).click();await page.getByLabel('QR content',{exact:true}).fill('QR');await page.getByTitle('Foreground',{exact:true}).fill('#ffffff');await page.getByRole('button',{name:'Add QR Code',exact:true}).click();await expect(alert).toBeVisible();await page.getByTitle('Foreground',{exact:true}).fill('#000000');await expect(alert).toHaveCount(0)
})
