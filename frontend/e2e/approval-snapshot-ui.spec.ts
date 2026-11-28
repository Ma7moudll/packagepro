import {test,expect} from '@playwright/test'
// UI-only fixtures. Real API, storage and permission checks live in backend tests.
const order={id:'ui-fixture',orderNumber:'UI-ONLY-TEST',status:'awaiting_approval',currency:'EGP',subtotal:20,tax:0,total:20,shipping:0,items:[{productType:'box',quantity:10,dimensions:{length:20,width:20,height:20}}],currentApprovalRequest:{id:'request-current',status:'pending',proofUrl:'/api/files/approval-snapshots/request-current/proof.pdf',proofFileId:'proof-current',expiresAt:'2026-11-30T00:00:00Z',deliveryState:'uncertain',current:true},design:{files:[{id:'print-current',fileName:'Current print.png',fileType:'print_file',fileUrl:'/api/files/print.png'},{id:'proof-old',fileType:'proof',fileUrl:'https://old.example.test/WRONG.pdf'}]}}
for(const [lang,width] of [['en',1280],['ar',320],['ar',360],['ar',390]] as const){
 test(`current proof and customer navigation ${lang} ${width}`,async({page})=>{
  await page.setViewportSize({width,height:800});await page.addInitScript(({lang})=>{localStorage.setItem('user',JSON.stringify({id:'fixture',email:'fixture@test.local',name:'Fixture',role:'TRADER'}));localStorage.setItem('language',lang);localStorage.setItem('accessToken','synthetic-ui-only')},{lang})
  await page.route('http://localhost:3000/api/**',r=>r.request().url().includes('/orders/')?r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:order})}):r.abort())
  await page.goto('/orders/ui-fixture/approve?token=ui-only');const proof=page.getByTestId('current-approval-proof');await expect(proof).toHaveAttribute('href','http://localhost:3000/api/files/approval-snapshots/request-current/proof.pdf');await proof.scrollIntoViewIfNeeded();const box=await proof.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.height).toBeGreaterThanOrEqual(44)
  await expect(proof).toHaveCount(1)
  for(const historical of order.design.files.filter(f=>f.fileType==='proof'))await expect(page.locator(`a[href="${historical.fileUrl}"]`)).toHaveCount(0)
  const visibleHit=await proof.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))});expect(visibleHit).toBe(true)
  const nav=page.getByRole('navigation',{name:lang==='ar'?'حساب العميل':'Customer account'});await expect(nav.getByRole('link',{name:lang==='ar'?'الطلبات':'Orders',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:lang==='ar'?'اعتماد التصميم':'Approve Design',exact:true})).toBeEnabled()
  await expect(page.getByRole('button',{name:lang==='ar'?'إرسال للمراجعة':'Send back for revision',exact:true})).toHaveCount(0)
  await expect(page.getByText(lang==='ar'?'لا توافق إذا احتجت تعديلات.':'Do not approve if changes are needed.',{exact:false})).toBeVisible()
 })
}
for(const width of [1280,320])test(`admin explicitly selects and acknowledges renewal ${width}`,async({page})=>{
 await page.setViewportSize({width,height:800});await page.addInitScript(()=>{localStorage.setItem('user',JSON.stringify({id:'fixture',email:'fixture@test.local',name:'Fixture',role:'ADMIN'}));localStorage.setItem('accessToken','synthetic-ui-only')});let payload:unknown=null
 await page.route('http://localhost:3000/api/**',r=>{
  if(r.request().url().endsWith('/request-approval')){payload=r.request().postDataJSON();return r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,message:'Synthetic UI request recorded',data:{requestId:'synthetic-new',deliveryState:'sent',reused:false}})})}
  return r.request().url().includes('/orders/')?r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:order})}):r.abort()
 })
 await page.goto('/admin/orders/ui-fixture/approval');await expect(page.getByTestId('approval-delivery-state')).toContainText('uncertain');await page.getByLabel('Print file',{exact:true}).selectOption('print-current');await page.getByLabel('Dieline',{exact:true}).selectOption('none');await page.getByLabel(/Explicit renewal/).check();const button=page.getByRole('button',{name:'Renew approval request',exact:true});await expect(button).toBeDisabled();await page.getByLabel(/I checked the saved content/).check();await button.evaluate(el=>el.scrollIntoView({block:'center'}));await button.focus();expect(await button.evaluate(el=>{const r=el.getBoundingClientRect();return document.activeElement===el&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);await button.click();await expect(page.getByText('Synthetic UI request recorded')).toBeVisible();expect(payload).toEqual({printFileId:'print-current',dielineFileId:null,renew:true})
})

for(const width of [1280,320])test(`admin explicitly reopens without sending ${width}`,async({page})=>{
 await page.setViewportSize({width,height:800});await page.addInitScript(()=>{localStorage.setItem('user',JSON.stringify({id:'fixture',email:'fixture@test.local',name:'Fixture',role:'ADMIN'}));localStorage.setItem('accessToken','synthetic-ui-only')});let payload:unknown=null,sends=0,reopened=false
 await page.route('http://localhost:3000/api/**',r=>{
  if(r.request().url().endsWith('/reopen-approval')){payload=r.request().postDataJSON();reopened=true;return r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,message:'Reopened. No email sent.'})})}
  if(r.request().url().endsWith('/request-approval'))sends++
  return r.request().url().includes('/orders/')?r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{...order,status:reopened?'pending_review':'ready_for_routing',currentApprovalRequest:{...order.currentApprovalRequest,status:reopened?'superseded':'approved'}}})}):r.abort()
 })
 await page.goto('/admin/orders/ui-fixture/approval');const button=page.getByRole('button',{name:'Reopen for fresh review',exact:true});await expect(button).toBeDisabled();await page.getByLabel('Reopen reason').fill('Artwork changed after approval');await expect(button).toBeDisabled();await page.getByLabel(/I want to invalidate/).check();await button.evaluate(el=>el.scrollIntoView({block:'center'}));await button.focus();expect(await button.evaluate(el=>{const r=el.getBoundingClientRect();return document.activeElement===el&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);await page.screenshot({path:`/downloads/approval-reopen-admin-${width}.png`});await button.click();await expect(page.getByText('Reopened for fresh review. No email sent.',{exact:false})).toBeVisible();expect(payload).toEqual({reason:'Artwork changed after approval'});expect(sends).toBe(0);await expect(button).toHaveCount(0)
})
