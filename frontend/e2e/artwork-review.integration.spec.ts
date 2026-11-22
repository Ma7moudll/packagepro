import {test,expect} from '@playwright/test'
import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {loginViaApi,BACKEND} from './helpers'

const fixture=JSON.parse(readFileSync('../backend/src/modules/designs/fixtures/f42-artwork-review.json','utf8'))

test('F42 saved review downloads actual registered artwork and reopens exact owner-bound bytes',async({page},testInfo)=>{
  await loginViaApi(page,process.env.LOCAL_QA_EMAIL)
  await page.goto('/editor?product=custom-mailer-box&editorDebug=1')
  await page.waitForFunction(()=>!!(window as any).__editorStore?.getState().product?.dieline)
  await page.evaluate((layers)=>{
    const store=(window as any).__editorStore
    store.getState().applyCoreState((s:any)=>({...s,layers,selectedLayerIds:[],canvas:{...s.canvas,backgroundColor:'#ffffff'},model:{...s.model,dimensions:{length:115,width:70,height:38},printCoverage:'outside',faces:s.model.faces.filter((f:any)=>!f.id.startsWith('inside_'))}}))
  },fixture.layers)
  await page.getByRole('tab',{name:'Export',exact:true}).click()
  await page.getByRole('button',{name:'Export',exact:true}).click()
  const dialog=page.getByRole('dialog')
  const upload=page.waitForResponse(r=>r.url().endsWith('/artwork-reviews')&&r.request().method()==='POST')
  const downloadPromise=page.waitForEvent('download')
  await dialog.locator('[data-artwork-review-download]').click()
  const response=await upload
  console.log('REVIEW UPLOAD',response.status(),await response.text())
  writeFileSync(testInfo.outputPath('candidate-review.pdf'),Buffer.from(response.request().postDataJSON().pdfBase64,'base64'))
  expect(response.status()).toBe(200)
  const record=(await response.json()).data
  const download=await downloadPromise
  const path=testInfo.outputPath('f42-saved-artwork-review.pdf');await download.saveAs(path)
  const bytes=readFileSync(path)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256)
  await expect(dialog.getByRole('status').filter({hasText:'Downloaded the saved RGB review'})).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('review-download-success.png')})
  const sessionId=new URL(page.url()).searchParams.get('sessionId')
  expect(sessionId).toBeTruthy()
  await page.goto(`/designs/${record.designId}`)
  await expect(page.getByText('RGB artwork review, not for production',{exact:true})).toBeVisible()
  const againPromise=page.waitForEvent('download')
  await page.locator('[data-artwork-review-download]').click()
  const again=await againPromise;const againPath=testInfo.outputPath('f42-retrieved-review.pdf');await again.saveAs(againPath)
  expect(readFileSync(againPath)).toEqual(bytes)
  await page.screenshot({path:testInfo.outputPath('review-design-files.png')})
  const privatePath=`${BACKEND}/designs/${record.designId}/artwork-reviews/${record.id}`
  expect((await page.request.get(privatePath)).status()).toBe(401)
  // A restored design is edited without creating an order. The old stored review must become stale.
  await page.goto(`/editor?sessionId=${sessionId}&editorDebug=1`)
  await page.waitForFunction(()=>!!(window as any).__editorStore?.getState().layers.find((l:any)=>l.id==='marker-front'))
  await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().updateLayer('marker-front',(l:any)=>({...l,textProperties:{...l.textProperties,content:'CHANGED'}}))})
  const save=page.waitForResponse(r=>r.url().endsWith('/designs/save')&&r.request().method()==='POST')
  await page.getByRole('button',{name:'Save',exact:true}).click();expect((await save).status()).toBe(200)
  const stale=await page.evaluate(async(url)=>{const r=await fetch(url,{headers:{Authorization:`Bearer ${localStorage.getItem('accessToken')}`}});return {status:r.status,body:await r.json()}},privatePath)
  expect(stale.status).toBe(409)
  console.log('REVIEW EVIDENCE',JSON.stringify({record,path,againPath,staleStatus:stale.status}))
})

test('review rejects unsupported coverage, missing embedded image and unsupported layer without downloading',async({page})=>{
  await loginViaApi(page,process.env.LOCAL_QA_EMAIL)
  await page.goto('/editor?product=custom-mailer-box&editorDebug=1')
  await page.waitForFunction(()=>!!(window as any).__editorStore?.getState().product?.dieline)
  await page.evaluate(layers=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers,model:{...s.model,printCoverage:'both'}}))},fixture.layers)
  await page.getByRole('tab',{name:'Export',exact:true}).click();await page.getByRole('button',{name:'Export',exact:true}).click()
  const dialog=page.getByRole('dialog');let downloads=0;page.on('download',()=>downloads++)
  await dialog.locator('[data-artwork-review-download]').click();await expect(dialog.getByRole('alert')).toContainText('outside-only')
  await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,model:{...s.model,printCoverage:'outside',faces:s.model.faces.filter((f:any)=>!f.id.startsWith('inside_'))},layers:[{...s.layers[0],type:'group'}]}))})
  await dialog.locator('[data-artwork-review-download]').click();await expect(dialog.getByRole('alert')).toContainText('unsupported layer type')
  await page.evaluate(()=>{const st=(window as any).__editorStore;st.getState().applyCoreState((s:any)=>({...s,layers:[{...s.layers[0],type:'image',imageProperties:{src:'data:image/png;base64,YQ=='}}]}))})
  await dialog.locator('[data-artwork-review-download]').click();await expect(dialog.getByRole('alert')).not.toBeEmpty()
  expect(downloads).toBe(0)
})
