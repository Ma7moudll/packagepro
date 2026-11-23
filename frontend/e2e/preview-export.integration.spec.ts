import {test,expect,type Page} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {parseImageDpi} from '../lib/editor/services/dpi'
import {loginViaApi} from './helpers'
const fixture=JSON.parse(readFileSync('../backend/src/modules/designs/fixtures/f42-artwork-review.json','utf8'))
async function setup(page:Page){
  await loginViaApi(page,process.env.LOCAL_QA_EMAIL)
  await page.goto('/editor?product=custom-mailer-box&editorDebug=1')
  await page.waitForFunction(()=>!!(window as any).__editorStore?.getState().product?.dieline)
  await page.evaluate(data=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:data.layers,selectedLayerIds:[],canvas:{...s.canvas,backgroundColor:'#ffffff'},model:{...s.model,dimensions:data.model.dimensions,printCoverage:'outside',faces:data.model.faces}}))},fixture)
  await page.getByRole('tab',{name:'Export',exact:true}).click()
}
async function open(page:Page){await page.getByRole('button',{name:'Export',exact:true}).click();const dialog=page.locator('[data-preview-export-dialog]');await expect(dialog).toBeVisible();return dialog}
async function option(page:Page,trigger:string,label:string|RegExp){await page.locator(trigger).click();await page.getByRole('option',{name:label,exact:typeof label==='string'}).click()}
async function download(page:Page,path:string){const waiting=page.waitForEvent('download');await page.locator('[data-preview-export]').click();await(await waiting).saveAs(path);await expect(page.locator('[data-preview-export-dialog]')).toBeHidden();return readFileSync(path)}
const pageCount=(bytes:Buffer)=>(bytes.toString('latin1').match(/\/Type \/Page\b/g)||[]).length

test('browser PDF contains six complete separate faces without production claims',async({page},info)=>{
  await setup(page);let dialog=await open(page)
  await expect(dialog.locator('[data-preview-limitations]')).toContainText('CMYK conversion')
  await expect(dialog.locator('[data-preview-export]')).toBeEnabled()
  await page.screenshot({path:info.outputPath('preview-dialog-top.png'),animations:'disabled'})
  const pdf=await download(page,info.outputPath('browser-six-face-preview.pdf'))
  expect(pageCount(pdf)).toBe(6);expect(pdf.toString('latin1')).not.toContain('Print-ready packaging design')
})

test('browser PNG and JPEG output bytes match selected face, sampling and format',async({page},info)=>{
  await setup(page);let dialog
  for(const density of [72,600]){
    dialog=await open(page);await option(page,'[data-preview-format]','PNG (One face)');await option(page,'[data-preview-face]',/\(top\)/);await option(page,'[data-preview-resolution]',`${density} PPI`)
    await expect(dialog.locator('#crop')).toBeDisabled();await expect(dialog.locator('#die')).toBeDisabled()
    const bytes=await download(page,info.outputPath(`browser-top-${density}.png`))
    expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(bytes.readUInt32BE(16)).toBe(Math.ceil(115*density/25.4));expect(bytes.readUInt32BE(20)).toBe(Math.ceil(70*density/25.4))
    expect(parseImageDpi(new Uint8Array(bytes).buffer,'image/png')).toBe(density)
  }
  dialog=await open(page);await option(page,'[data-preview-format]','JPEG (One face)');await option(page,'[data-preview-resolution]','300 PPI')
  await page.screenshot({path:info.outputPath('preview-jpeg-options.png'),animations:'disabled'})
  const jpg=await download(page,info.outputPath('browser-top.jpg'))
  expect(jpg.subarray(0,3).toString('hex')).toBe('ffd8ff');expect(parseImageDpi(new Uint8Array(jpg).buffer,'image/jpeg')).toBe(300)
  const size=await page.evaluate(async b64=>{const blob=await(await fetch(`data:image/jpeg;base64,${b64}`)).blob();const image=await createImageBitmap(blob);const size={width:image.width,height:image.height};image.close();return size},jpg.toString('base64'))
  expect(size).toEqual({width:1359,height:827})
})

test('browser SVG escaping and both-side PDF coverage remain explicit',async({page},info)=>{
  await setup(page)
  await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,model:{...s.model,faces:s.model.faces.map((f:any)=>f.id==='front'?{...f,name:'FRONT <script>bad()</script>&'}:f)}}))})
  await open(page);await option(page,'[data-preview-format]','SVG (Raster artwork)')
  const svg=(await download(page,info.outputPath('browser-six-face-preview.svg'))).toString()
  expect((svg.match(/data-face=/g)||[]).length).toBe(6);expect(svg).not.toContain('<script>');expect(svg).toContain('&lt;script&gt;');expect(svg).toContain('width="135mm"')
  await page.evaluate(data=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:[...data.layers,...data.layers.filter((l:any)=>l.type==='text').map((l:any)=>({...l,id:l.id+'-inside',faceId:'inside_'+l.faceId,textProperties:{...l.textProperties,content:'INSIDE '+l.faceId.toUpperCase()}}))],model:{...s.model,printCoverage:'both',faces:[...data.model.faces,...data.model.faces.map((f:any)=>({...f,id:'inside_'+f.id,name:'Inside '+f.name}))]}}))},fixture)
  await open(page);await option(page,'[data-preview-format]','PDF (Separate faces)');await option(page,'[data-preview-resolution]','150 PPI')
  expect(pageCount(await download(page,info.outputPath('browser-both-12-faces.pdf')))).toBe(12)
  await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,model:{...s.model,printCoverage:'inside'}}))})
  await open(page);expect(pageCount(await download(page,info.outputPath('browser-inside-six-faces.pdf')))).toBe(6)
})

test('browser preview rejects missing assets, unsupported layers and incomplete coverage with no download',async({page},info)=>{
  await setup(page);const dialog=await open(page);let downloads=0;page.on('download',()=>downloads++)
  await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:[{...s.layers[0],type:'group'}]}))})
  await dialog.locator('[data-preview-export]').click();await expect(dialog.getByRole('alert')).toContainText('unsupported layer type')
  await page.evaluate(data=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:[{...data.layers[0],type:'image',imageProperties:{src:'data:image/png;base64,YQ=='}}]}))},fixture)
  await dialog.locator('[data-preview-export]').click();await expect(dialog.getByRole('alert')).toContainText('could not be loaded')
  // Deliberately malformed persisted state, bypassing the normal editor face normalizer.
  await page.evaluate(data=>{const st=(window as any).__editorStore;st.setState((s:any)=>({layers:data.layers,model:{...s.model,printCoverage:'both',faces:data.model.faces}}))},fixture)
  await dialog.locator('[data-preview-export]').click();await expect(dialog.getByRole('alert')).toContainText('matching saved inside and outside')
  await page.setViewportSize({width:390,height:844});await dialog.getByRole('alert').scrollIntoViewIfNeeded({timeout:15000});await page.screenshot({path:info.outputPath('preview-mobile-error.png')})
  expect(downloads).toBe(0)
})
