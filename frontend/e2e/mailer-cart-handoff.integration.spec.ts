import type {Page} from '@playwright/test'
import {test,expect} from './local-customer-fixture'
import {loginViaApi,BACKEND} from './helpers'

async function enter(page:Page,email:string){
 if(!email.endsWith('@packagepro.test'))throw new Error('Isolated QA customer required')
 const auth=await loginViaApi(page,email)
 const cleared=await page.request.delete(BACKEND+'/cart',{headers:{Authorization:'Bearer '+auth.tokens.accessToken}});expect(cleared.ok()).toBe(true)
 await page.goto('/editor?product=custom-mailer-box&editorDebug=1');await page.waitForFunction(()=>!!(window as any).__editorStore?.getState().product)
 await page.evaluate(()=>{const st=(window as any).__editorStore;(window as any).__cartTestStore=st;(window as any).__editorSetViewMode('2d');st.getState().applyCoreState((s:any)=>({...s,layers:[{id:'cart-art',name:'Cart artwork',type:'text',faceId:'front',visible:true,locked:false,opacity:1,blendMode:'normal',rotation:0,position:{x:140,y:60},scale:{x:1,y:1},textProperties:{content:'BEFORE',fontFamily:'Arial',fontSize:28,fontWeight:700,color:'#174e32',align:'center',letterSpacing:0,lineHeight:1}}],selectedLayerIds:[]}))})
}
async function edit(page:Page,text:string){await page.evaluate(text=>(window as any).__cartTestStore.getState().updateLayer('cart-art',(l:any)=>({...l,textProperties:{...l.textProperties,content:text}})),text)}
async function cloud(page:Page,sid:string){return page.evaluate(async({api,sid})=>{const r=await fetch(api+'/designs/session/'+sid,{headers:{Authorization:'Bearer '+localStorage.getItem('accessToken')}});return r.json()},{api:BACKEND,sid})}

for (const stableExit of [false, true]) test(`one shared mailer handoff saves current artwork, shows failures and blocks a changed save${stableExit ? ' with stable slow exit' : ''}`,async({page,localCustomer})=>{
 await enter(page,localCustomer.email);
 // An exiting Radix dialog stays visible and hides the background from role
 // locators. A stable opacity-only exit exposes wrong-target reopen races.
 if(stableExit)await page.addStyleTag({content:'@keyframes handoffExit{from{opacity:1}to{opacity:0}}[data-slot=dialog-content][data-state=closed],[data-slot=dialog-overlay][data-state=closed]{animation:handoffExit 2s linear !important;transform:translate(-50%,-50%) !important}'});
 let posts=0;page.on('request',r=>{if(r.url().endsWith('/cart/items')&&r.method()==='POST')posts++})
 await page.getByRole('button',{name:'Continue',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible()
 await dialog.getByRole('button',{name:'Add to Cart',exact:true}).focus();await page.keyboard.press('Control+z');expect(await page.evaluate(()=>(window as any).__cartTestStore.getState().layers[0]?.textProperties.content)).toBe('BEFORE')
 await page.route('**/api/designs/save',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,message:'Isolated save failure'})}))
 await dialog.getByRole('button',{name:'Add to Cart',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Could not save');expect(posts).toBe(0);await page.unroute('**/api/designs/save')
 await page.route('**/api/cart/items',route=>route.request().method()==='POST'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,message:'Isolated cart failure'})}):route.continue())
 await dialog.getByRole('button',{name:'Add to Cart',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Your design is saved');expect(posts).toBe(1);await page.screenshot({path:'/downloads/mailer-cart-visible-retry.png',animations:'disabled'})
 const sid=new URL(page.url()).searchParams.get('sessionId')!;expect(sid).toBeTruthy();await dialog.getByRole('button',{name:'Close',exact:true}).click();
 // Wait for the close lifecycle, not a fixed sleep or force click. Otherwise
 // the page-wide label can select the still-exiting dialog submit button.
 await expect(dialog).toBeHidden();await edit(page,'AFTER')
 await page.locator('header').getByRole('button',{name:'Add to Cart',exact:true}).click();await expect(dialog).toHaveAttribute('data-state','open');let release!:()=>void;const gate=new Promise<void>(r=>release=r);let requested!:()=>void;const started=new Promise<void>(r=>requested=r)
 await page.route('**/api/designs/save',async route=>{requested();await gate;await route.continue()});await dialog.getByRole('button',{name:'Add to Cart',exact:true}).click();await started;await expect(dialog.getByLabel('Design Name',{exact:true})).toBeDisabled();await edit(page,'LATEST');release();await expect(dialog.getByRole('alert')).toContainText('design changed while saving');expect(posts).toBe(1);await page.unroute('**/api/designs/save');await page.unroute('**/api/cart/items')
 const expected=await page.evaluate(()=>{const s=(window as any).__cartTestStore.getState();return {productId:s.product.id,variantId:s.productConfig.variantId,sku:s.productConfig.sku,dimensions:s.model.dimensions,quantity:s.model.quantity,material:s.model.material}})
 const response=page.waitForResponse(r=>r.url().endsWith('/cart/items')&&r.request().method()==='POST');await dialog.getByRole('button',{name:'Add to Cart',exact:true}).click();const added=await response;expect(added.status()).toBe(200);const cart=(await added.json()).data;await page.waitForURL('**/cart');const item=cart.items[0];expect(cart.items).toHaveLength(1);expect(item).toMatchObject({sessionId:sid,productId:expected.productId,variantId:expected.variantId,sku:expected.sku,quantity:expected.quantity,materialCode:expected.material,dimensions:{...expected.dimensions,unit:'mm'}})
 const saved=await cloud(page,sid);expect(saved.data.designData.layers[0].textProperties.content).toBe('LATEST');expect(saved.data.designData.manifest.product.id).toBe(expected.productId);expect(saved.data.designData.manifest.variant.sku).toBe(expected.sku);expect(saved.data.designData.manifest.variant.dimensions).toEqual({...expected.dimensions,unit:'mm'});await page.screenshot({path:'/downloads/mailer-cart-current-artwork-cart.png',animations:'disabled'});console.log('MAILER HANDOFF',JSON.stringify({sid,expected,item:{id:item.id,designId:item.designId,sessionId:item.sessionId},savedText:saved.data.designData.layers[0].textProperties.content,posts}))
})

test('new edits during cart response stay in editor and are not claimed as added',async({page,localCustomer})=>{
 await enter(page,localCustomer.email);await page.getByRole('button',{name:'Continue',exact:true}).click();const dialog=page.getByRole('dialog');let release!:()=>void;const gate=new Promise<void>(r=>release=r);let ready!:()=>void;const fetched=new Promise<void>(r=>ready=r)
 await page.route('**/api/cart/items',async route=>{if(route.request().method()!=='POST')return route.continue();const response=await route.fetch();ready();await gate;await route.fulfill({response})})
 await dialog.getByRole('button',{name:'Add to Cart',exact:true}).click();await fetched;await edit(page,'NEWER UNSAVED');release();await expect(dialog.getByRole('alert')).toContainText('saved version was added');await expect(dialog.getByRole('button',{name:'Add to Cart',exact:true})).toBeDisabled();expect(new URL(page.url()).pathname).toBe('/editor');await page.waitForFunction(()=>new URL(location.href).searchParams.has('sessionId'));const sid=new URL(page.url()).searchParams.get('sessionId')!;expect((await cloud(page,sid)).data.designData.layers[0].textProperties.content).toBe('BEFORE');expect(await page.evaluate(()=>(window as any).__cartTestStore.getState().layers[0].textProperties.content)).toBe('NEWER UNSAVED');await page.screenshot({path:'/downloads/mailer-cart-newer-edits-retained.png',animations:'disabled'});await dialog.getByRole('button',{name:'Return to editor',exact:true}).click();console.log('POST RESPONSE newer edits retained without navigation')
})

test('inside printing and custom stock keep both cart triggers disabled',async({page,localCustomer})=>{
 await enter(page,localCustomer.email);await page.evaluate(()=>(window as any).__cartTestStore.getState().applyCoreState((s:any)=>({...s,model:{...s.model,printCoverage:'inside'}})));await expect(page.getByRole('button',{name:'Add to Cart',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Quote required',exact:true})).toBeDisabled()
 await page.evaluate(()=>(window as any).__cartTestStore.getState().applyCoreState((s:any)=>({...s,model:{...s.model,printCoverage:'outside',boardSpecification:{version:1,outside:'brown-dark',inside:'white-imported-matte',coatings:{cellophane:false,uv:false},print:{colourCount:4,customColours:''}}}})));await expect(page.getByRole('button',{name:'Add to Cart',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Quote required',exact:true})).toBeDisabled();console.log('QUOTE GUARDS preserved')
})

test('local session URL handoff does not exempt reload or external session navigation',async({page,localCustomer})=>{
 await enter(page,localCustomer.email);await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(()=>new URL(location.href).searchParams.has('sessionId'));const sidA=new URL(page.url()).searchParams.get('sessionId')!;await edit(page,'UNSAVED A');await page.reload();await page.waitForFunction(()=>typeof(window as any).__editorSetViewMode==='function');await page.evaluate(()=>(window as any).__editorSetViewMode('3d'));await page.waitForFunction(()=>(window as any).__editorStore?.getState().layers[0]?.textProperties?.content==='BEFORE');await page.evaluate(()=>{(window as any).__cartTestStore=(window as any).__editorStore;(window as any).__editorSetViewMode('2d')})
 const saved=await cloud(page,sidA);const sidB=await page.evaluate(async({api,saved})=>{const headers={'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('accessToken')};const created=await fetch(api+'/designs/session',{method:'POST',headers,body:JSON.stringify({name:'Isolated external-session navigation'})});const j=await created.json();const sid=j.data.sessionId;const data=structuredClone(saved.data.designData);data.layers[0].textProperties.content='EXTERNAL B';const response=await fetch(api+'/designs/save',{method:'POST',headers,body:JSON.stringify({sessionId:sid,designData:data,productId:saved.data.productId,variantId:saved.data.variantId,sku:saved.data.sku,designConfig:saved.data.designConfig})});if(!response.ok)throw new Error('External local session setup failed');return sid},{api:BACKEND,saved})
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForTimeout(200);await edit(page,'UNSAVED AFTER SAVE')
 for(const [sid,text] of [[sidB,'EXTERNAL B'],[sidA,'BEFORE']]){await page.evaluate(sid=>history.pushState(null,'','/editor?product=custom-mailer-box&editorDebug=1&sessionId='+sid),sid);await page.waitForFunction(text=>(window as any).__cartTestStore.getState().layers[0]?.textProperties?.content===text,text)}console.log('SESSION RESTORE normal reload and external A/B navigation passed')
})

test('normal guest sign-in return retains its current artwork without auth redesign',async({browser,localCustomer})=>{
 const context=await browser.newContext();const page=await context.newPage();await page.goto('http://localhost:3001/editor?product=custom-mailer-box&editorDebug=1');await page.waitForFunction(()=>!!(window as any).__editorStore?.getState().product)
 await page.evaluate(()=>{const st=(window as any).__editorStore;(window as any).__editorSetViewMode('2d');st.getState().applyCoreState((s:any)=>({...s,layers:[{id:'guest-art',name:'GUEST KEEP',type:'text',faceId:'front',visible:true,locked:false,opacity:1,blendMode:'normal',rotation:0,position:{x:120,y:50},scale:{x:1,y:1},textProperties:{content:'GUEST KEEP',fontFamily:'Arial',fontSize:22,fontWeight:700,color:'#174e32',align:'center',letterSpacing:0,lineHeight:1}}],selectedLayerIds:[]}))})
 await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Sign in to continue',exact:true}).click();await page.waitForURL('**/login?**');await page.getByLabel('Email',{exact:false}).fill(localCustomer.email);await page.getByLabel('Password',{exact:true}).fill(localCustomer.password);await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/editor?**');await page.evaluate(()=>(window as any).__editorSetViewMode('3d'));await page.waitForFunction(()=>!!(window as any).__editorStore);expect(await page.evaluate(()=>(window as any).__editorStore.getState().layers[0]?.textProperties.content)).toBe('GUEST KEEP');console.log('GUEST normal SPA sign-in preserved artwork');await context.close()
})

test('catalog preset totals match footer, dialog, quantity panel and saved-artwork cart at 30/100/300',async({page,localCustomer})=>{
 let genericCalls=0;page.on('request',r=>{if(r.url().endsWith('/pricing/calculate'))genericCalls++})
 for(const quantity of [30,100,300]){
  await enter(page,localCustomer.email)
  await page.evaluate(quantity=>(window as any).__cartTestStore.getState().applyCoreState((s:any)=>({...s,model:{...s.model,quantity}})),quantity)
  const selection=await page.evaluate(()=>{const s=(window as any).__cartTestStore.getState();return {variantId:s.productConfig.variantId,sku:s.productConfig.sku,quantity:s.model.quantity,dimensions:{...s.model.dimensions,unit:'mm'},config:{size:s.productConfig.selectedSize,material:s.model.material,printColors:'none',printSides:'outside_only',finish:'none'}}})
  const reference=await page.request.post(BACKEND+'/catalog/custom-mailer-box/quote',{data:selection});expect(reference.ok()).toBe(true);const quote=(await reference.json()).data
  await expect(page.getByTestId('editor-summary-total')).toContainText(quote.breakdown.total.toFixed(2))
  await page.getByRole('tab',{name:'Price',exact:true}).click()
  await expect(page.getByTestId('editor-price-panel-total')).toContainText(new Intl.NumberFormat('en-US',{style:'currency',currency:'EGP'}).format(quote.breakdown.total))
  const merchandise=Math.round((quote.breakdown.subtotal+quote.breakdown.tax)*100)/100
  await expect(page.getByTestId('editor-merchandise-unit')).toContainText((merchandise/quantity).toFixed(2))
  await expect(page.getByTestId('editor-price-panel')).toContainText('excl. shipping')
  await page.getByRole('button',{name:'Continue',exact:true}).click();const dialog=page.getByRole('dialog')
  await expect(page.getByTestId('editor-dialog-total')).toContainText(quote.breakdown.total.toFixed(2));await expect(dialog).toContainText('incl. shipping')
  await dialog.getByLabel('Design Name',{exact:true}).fill('Parity '+quantity)
  if(quantity===30)await page.screenshot({path:'/downloads/mailer-price-parity-dialog.png',animations:'disabled'})
  const response=page.waitForResponse(r=>r.url().endsWith('/cart/items')&&r.request().method()==='POST');await dialog.getByRole('button',{name:'Add to Cart',exact:true}).click();const added=await response;expect(added.ok()).toBe(true);const cart=(await added.json()).data
  expect(cart.items).toHaveLength(1);expect(cart.summary.total).toBe(quote.breakdown.total);expect(cart.items[0].totalPrice).toBe(merchandise);expect(cart.items[0].shipping).toBe(quote.breakdown.shippingEstimate)
  expect(cart.items[0].config).toMatchObject({...selection.config,designName:'Parity '+quantity});expect(cart.items[0].sku).toBe(selection.sku)
  await page.waitForURL('**/cart');console.log('CATALOG PARITY',JSON.stringify({quantity,total:cart.summary.total,merchandise,shipping:cart.summary.shipping,config:cart.items[0].config}))
 }
 expect(genericCalls).toBe(0)
})

test('unrepresentable dimensions, material and advanced options stay visible but unpriced',async({page,localCustomer})=>{
 await enter(page,localCustomer.email);await expect(page.getByTestId('editor-summary-total')).toContainText('409.99')
 await page.evaluate(()=>(window as any).__basePreset=structuredClone((window as any).__cartTestStore.getState().history.present))
 const changes=[{dimensions:{length:116,width:70,height:38}},{material:'white'},{colorVariant:'one_colour'},{colorVariant:'multicolour_premium'},{finishing:'matte'},{lamination:'soft-touch'},{adhesiveStrip:'double'}]
 let posts=0;page.on('request',r=>{if(r.url().endsWith('/cart/items')&&r.method()==='POST')posts++})
 for(const change of changes){
  await page.evaluate(change=>{const st=(window as any).__cartTestStore;st.getState().applyCoreState(()=>({...structuredClone((window as any).__basePreset),model:{...(window as any).__basePreset.model,...change}}))},change)
  await expect(page.getByTestId('editor-summary-total')).toContainText('Quote required');await expect(page.getByRole('button',{name:'Add to Cart',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Quote required',exact:true})).toBeDisabled()
  expect(await page.evaluate(()=>(window as any).__cartTestStore.getState().model)).toMatchObject(change)
 }
 expect(posts).toBe(0);await page.screenshot({path:'/downloads/mailer-price-unrepresentable-guard.png',animations:'disabled'})
})

test('new preset print initialization is explicit while saved print choices survive reload and switching',async({page,localCustomer})=>{
 await enter(page,localCustomer.email);expect(await page.evaluate(()=>(window as any).__cartTestStore.getState().model.colorVariant)).toBe('none')
 await page.evaluate(()=>(window as any).__cartTestStore.getState().applyCoreState((s:any)=>({...s,model:{...s.model,colorVariant:'one_colour'}})))
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(()=>new URL(location.href).searchParams.has('sessionId'));await page.reload();await page.waitForFunction(()=>(window as any).__editorStore?.getState().model.colorVariant==='one_colour');await page.evaluate(()=>{(window as any).__cartTestStore=(window as any).__editorStore;(window as any).__editorSetViewMode('2d')})
 await expect(page.getByTestId('editor-summary-total')).toContainText('Quote required');await expect(page.getByRole('button',{name:'Add to Cart',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Advanced Options',exact:true}).click();await expect(page.getByRole('combobox').filter({hasText:'One Colour'})).toBeVisible();await page.screenshot({path:'/downloads/mailer-price-saved-print-preserved.png',animations:'disabled'})
 const switched=await page.evaluate(async api=>{
  const detail=(await(await fetch(api+'/catalog/custom-mailer-box')).json()).data
  const config=(await(await fetch(api+'/catalog/custom-mailer-box/editor-config')).json()).data
  const next=detail.variants.find((v:any)=>v.id!==config.variant.id&&v.materialCode===config.material.code&&v.printMode==='none'&&v.finish==='none');if(!next)throw new Error('Second native variant required')
  const factor=next.dimensions.unit==='cm'?10:1;config.variant={...next,printSides:next.printSides==='inside_outside'?2:1,dimensions:{...next.dimensions,length:next.dimensions.length*factor,width:next.dimensions.width*factor,height:next.dimensions.height*factor,unit:'mm'}}
  ;(window as any).__cartTestStore.getState().initFromEditorConfig(config,{preserveHistory:true});return {variantId:next.id,printMode:next.printMode}
 },BACKEND)
 expect(switched.printMode).toBe('none');expect(await page.evaluate(()=>(window as any).__cartTestStore.getState().model.colorVariant)).toBe('none');expect(await page.evaluate(()=>(window as any).__cartTestStore.getState().productConfig.variantId)).toBe(switched.variantId)
 await expect(page.getByTestId('editor-summary-total')).toContainText(/\d+\.\d{2}/);await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled()
 for(const slug of ['custom-shipping-box','custom-mailer-box']){
  const state=await page.evaluate(async({api,slug})=>{const res=await fetch(api+'/catalog/'+slug+'/editor-config');if(!res.ok)throw new Error('Native product switch unavailable');const config=(await res.json()).data;(window as any).__cartTestStore.getState().initFromEditorConfig(config,{preserveHistory:true});const s=(window as any).__cartTestStore.getState();return {slug:s.product.slug,colour:s.model.colorVariant,print:config.variant.printMode}},{api:BACKEND,slug})
  expect(state.slug).toBe(slug);expect(state.print).toBe('none');expect(state.colour).toBe('none')
  if(slug==='custom-mailer-box')await expect(page.getByTestId('editor-summary-total')).toContainText('409.99');else await expect(page.getByTestId('editor-summary-total')).toContainText('Quote required')
 }
})

test('catalog failures are recoverable and stale prices cannot enable a changed configuration',async({page,localCustomer})=>{
 await enter(page,localCustomer.email);await expect(page.getByTestId('editor-summary-total')).toContainText('409.99');await page.getByRole('button',{name:'Continue',exact:true}).click();const dialog=page.getByRole('dialog')
 await page.route('**/api/catalog/custom-mailer-box/quote',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,message:'Isolated quote failure'})}))
 await dialog.locator('#quantity').fill('100');await expect(dialog).toContainText('Price unavailable');await expect(dialog.getByRole('button',{name:'Add to Cart',exact:true})).toBeDisabled()
 await page.unroute('**/api/catalog/custom-mailer-box/quote');await dialog.getByRole('button',{name:'Retry price',exact:true}).click();await expect(page.getByTestId('editor-dialog-total')).toContainText('1210.81')
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);let ready!:()=>void;const started=new Promise<void>(r=>ready=r)
 await page.route('**/api/catalog/custom-mailer-box/quote',async route=>{ready();await gate;await route.continue()});await dialog.locator('#quantity').fill('300');await started
 await page.evaluate(()=>(window as any).__cartTestStore.getState().applyCoreState((s:any)=>({...s,model:{...s.model,dimensions:{...s.model.dimensions,length:116}}})));release()
 await expect(dialog).toContainText('requires a quote');await expect(dialog.getByRole('button',{name:'Add to Cart',exact:true})).toBeDisabled();await expect(page.getByTestId('editor-dialog-total')).toHaveCount(0)
})


test('nonzero-tax catalog response stays visibly unpriced and blocks editor cart continuation',async({page,localCustomer})=>{
 await page.route('**/api/catalog/custom-mailer-box/quote',async route=>{const response=await route.fetch();const json=await response.json();if(json.success&&json.data){json.data.breakdown.tax=10;json.data.breakdown.total+=10;json.data.totalPrice+=10}await route.fulfill({response,json})})
 let posts=0;page.on('request',r=>{if(r.url().endsWith('/cart/items')&&r.method()==='POST')posts++})
 await enter(page,localCustomer.email);await expect(page.getByTestId('editor-summary-total')).toContainText('Quote required');await expect(page.getByRole('button',{name:'Add to Cart',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Quote required',exact:true})).toBeDisabled()
 await page.getByRole('tab',{name:'Price',exact:true}).click();await expect(page.getByRole('status')).toContainText('require an approved quote');expect(posts).toBe(0)
 await page.screenshot({path:'/downloads/mailer-price-nonzero-tax-guard.png',animations:'disabled'})
})
