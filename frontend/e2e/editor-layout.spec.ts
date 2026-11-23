import { test, expect } from '@playwright/test';

for (const language of ['en', 'ar']) {
  for (const width of [320, 360, 390, 768, 1024, 1100, 1280, 1440]) {
    test(`editor controls and preview fit ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(l => localStorage.setItem('language', l), language);
      await page.goto('/editor?editorDebug=1', { waitUntil: 'load' });
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
      const save = page.locator('header button[data-save-status]');
      await expect(save).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.waitForFunction(() => typeof (window as any).__editor3DFaces === 'function');
      // Mesh centers must be inside the live camera frame, not merely the DOM.
      await expect.poll(() => page.evaluate(() => (window as any).__editor3DFaces().every((f:any) => f.visible))).toBe(true);
      const launcher = page.getByRole('button', {name: language === 'ar' ? 'فتح الدعم' : 'Open support', exact:true});
      const launcherBox = await launcher.boundingBox();
      if (width >= 1024) {
        const panel = await page.locator("[data-editor-properties]").boundingBox();
        const overlap = launcherBox!.x < panel!.x + panel!.width && launcherBox!.x + launcherBox!.width > panel!.x;
        expect(overlap).toBe(false);
      }
      expect(launcherBox!.y + launcherBox!.height).toBeLessThanOrEqual(752);
      // Every visible header control must fit and be reachable at its center.
      const headerControls = await page.locator('header button').evaluateAll(buttons => buttons.filter(b => {
        const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0;
      }).map(b => {
        const r = b.getBoundingClientRect();
        return {left:r.left, right:r.right, hit:b instanceof HTMLButtonElement && (b.disabled || document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button') === b)};
      }));
      for (const control of headerControls) {
        expect(control.left).toBeGreaterThanOrEqual(0);
        expect(control.right).toBeLessThanOrEqual(width);
        expect(control.hit).toBe(true);
      }
      await expect(page.getByRole('button', {name: language === 'ar' ? 'إغلاق المحرر' : 'Close Editor', exact:true})).toBeVisible();
      const canvas = await page.locator('canvas').first().boundingBox();
      expect(canvas!.x).toBeGreaterThanOrEqual(56);
      expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(width);
      if (width < 1280) {
        if (width < 1024) await expect.poll(async () => (await page.locator("[data-editor-properties]").boundingBox())!.width).toBeLessThanOrEqual(1);
        const more = page.locator('header button[aria-haspopup="menu"]');
        await more.click();
        await page.getByRole('menuitem', { name: language === 'ar' ? 'معاينة Mockup' : 'Mockup Preview' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('status')).toContainText(language === 'ar' ? 'لقطة RGB محلية' : 'Local RGB snapshot');
        const close = dialog.locator('[data-slot=dialog-close]');
        const closeBox = await close.boundingBox();
        expect(closeBox!.x).toBeGreaterThanOrEqual(0);
        expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(width);
        await dialog.locator('div.overflow-y-auto').first().evaluate(e => { e.scrollTop = e.scrollHeight; });
        await close.click();
        await expect(dialog).toBeHidden();
        await more.click();
        await page.getByRole('menuitem', { name: language === 'ar' ? 'مشاركة' : 'Share', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('dialog').locator('[data-slot=dialog-close]').click();
        await expect(page.getByRole('dialog')).toBeHidden();
        // Exercise both side panel toggles, including closure via backdrop.
        if (width < 1024) for (const index of [0, 1]) {
          await page.locator('header button').nth(index).click();
          if (index === 1) await expect.poll(async () => (await page.locator('[data-editor-properties]').boundingBox())!.width).toBeGreaterThan(200);
          await page.locator('.fixed.inset-0.bg-black\\/30').first().click({position:{x:width / 2,y:10}});
        }
      }
      // Manual save is contained: cloud fails, local write must still finish.
      await page.route('**/api/**', route => route.fulfill({ status: 503, contentType:'application/json', body:'{"success":false}' }));
      await save.click();
      await expect(save).toHaveAttribute('data-save-status', 'saved');
      await expect(save).toBeEnabled();
    });
  }
}

test('failed local autosave stays failed, retains design, and allows retry', async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    (window as any).__restorePut = () => { IDBObjectStore.prototype.put = original; };
    IDBObjectStore.prototype.put = function () { throw new DOMException('Test write denied', 'QuotaExceededError'); };
  });
  await page.goto('/editor?editorDebug=1', { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean((window as any).__editorStore));
  const save = page.locator('header button[data-save-status]');
  const before = await page.evaluate(() => JSON.stringify((window as any).__editorStore.getState().history.present));
  await expect(save).toHaveAttribute('data-save-status', 'error', { timeout: 40_000 });
  expect(await page.evaluate(() => JSON.stringify((window as any).__editorStore.getState().history.present))).toBe(before);
  await page.waitForTimeout(3100);
  await expect(save).toHaveAttribute('data-save-status', 'error');
  await page.route('**/api/**', route => route.fulfill({ status: 503, contentType:'application/json', body:'{"success":false}' }));
  await page.evaluate(() => (window as any).__restorePut());
  await save.click();
  await expect(save).toHaveAttribute('data-save-status', 'saved');
});

for (const language of ['en', 'ar']) test(`flagged card warning and refusal stay reachable ${language} 320`, async ({page}, info) => {
  await page.setViewportSize({width:320,height:568})
  await page.addInitScript(l=>localStorage.setItem('language',l),language)
  await page.goto('/editor?editorDebug=1')
  await page.waitForFunction(()=>!!(window as any).__editorStore)
  await page.evaluate(()=>{
    const st=(window as any).__editorStore
    ;(window as any).__editorSetViewMode('2d')
    st.getState().applyCoreState((s:any)=>({...s,model:{...s.model,type:'business_card',dimensions:{length:85,width:1,height:55},printCoverage:'both',faces:['front','back','inside_front','inside_back'].map(id=>({id,name:id}))},canvas:{...s.canvas,width:255,height:165},layers:[{id:'inside-regression',name:'Inside artwork',type:'text',faceId:'inside_front',visible:true,locked:false,opacity:1,blendMode:'normal',rotation:0,position:{x:60,y:50},scale:{x:1,y:1},textProperties:{content:'INSIDE',fontFamily:'Arial',fontSize:20,fontWeight:700,color:'#174e32',align:'center',letterSpacing:0,lineHeight:1}}]}))
  })
  const controls=page.locator('[data-editor-bottom-controls]')
  for(const name of [language==='ar'?'داخلي':'Inside', 'inside_back',language==='ar'?'خارجي':'Outside','back']){
    const button=controls.getByRole('button',{name,exact:true})
    await button.scrollIntoViewIfNeeded();await button.click()
  }
  const warning=page.locator('[data-unsupported-artwork-warning]')
  async function within(locator:any){const b=await locator.boundingBox();expect(b).not.toBeNull();expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(320.5)}
  await within(page.locator('[data-editor-workspace]'));await within(warning)
  const details=warning.getByRole('button',{name:'Details',exact:true});await within(details);await details.click()
  const dialog=page.getByRole('dialog')
  await expect.poll(()=>dialog.evaluate(e=>e.getAnimations({subtree:true}).every(a=>a.playState==='finished'||a.playState==='idle')&&getComputedStyle(e).opacity==='1')).toBe(true)
  await within(dialog);await expect(dialog).toContainText('proof generation')
  await page.screenshot({path:info.outputPath(`flagged-${language}-details.png`)})
  await dialog.getByRole('button',{name:'Close',exact:true}).click();await expect(dialog).toBeHidden()
  const dl=page.getByTitle(language==='ar'?'تنزيل الوجه الحالي (مرجع PNG)':'Download current face (PNG reference)',{exact:true})
  await dl.scrollIntoViewIfNeeded();await within(dl)
  let downloads=0;page.on('download',()=>downloads++);await dl.click()
  await expect(page.getByRole('alert').filter({hasText:language==='ar'?'التنزيل محظور':'Download blocked'})).toBeVisible();expect(downloads).toBe(0)
  await page.screenshot({path:info.outputPath(`flagged-${language}-refusal.png`)})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})
