import {test,expect} from '@playwright/test';
for (const language of ['en','ar']) for (const width of [320,1100,1280]) {
  test(`unavailable editor actions are honest ${language} ${width}`,async({page},info)=>{
    await page.setViewportSize({width,height:800});
    await page.addInitScript(l=>localStorage.setItem('language',l),language);
    let downloads=0; const effects:string[]=[];
    page.on('download',()=>downloads++);
    page.on('request',r=>{if(/share|invite|collaborat/i.test(r.url())&&r.method()!=='GET')effects.push(r.url());});
    await page.goto('/editor?editorDebug=1');
    await page.waitForFunction(()=>typeof (window as any).__editor3DFaces==='function'&&(window as any).__editor3DFaces().length>0);
    const ar=language==='ar';
    async function openAction(name:string){
      if(width<1280){await page.getByRole('button',{name:ar?'المزيد':'More',exact:true}).click();await page.getByRole('menuitem',{name,exact:true}).click();}
      else await page.locator('header').getByRole('button',{name,exact:true}).click();
    }
    await openAction(ar?'مشاركة':'Share');
    let dialog=page.getByRole('dialog');
    await expect(dialog.getByRole('status')).toHaveText(ar?'مشاركة التصميم غير متاحة حاليًا.':'Design sharing is not available yet.');
    await expect(dialog.locator('input,[role="switch"],[role="combobox"],a')).toHaveCount(0);
    await expect(dialog).not.toContainText('@example.com');
    await page.screenshot({animations:'disabled',path:info.outputPath(`action-share-${language}-${width}.png`)});
    await dialog.locator('[data-slot=dialog-close]').click();
    await openAction(ar?'معاينة Mockup':'Mockup Preview');
    dialog=page.getByRole('dialog');
    await expect(dialog.getByRole('status')).toContainText(ar?'تصدير Mockup غير متاح':'Mockup export is not available');
    await expect(dialog.getByRole('button',{name:ar?'تصدير Mockup':'Export Mockup',exact:true})).toHaveCount(0);
    await expect(dialog.getByRole('combobox')).toHaveCount(0);
    await dialog.getByRole('button',{name:ar?'استوديو داكن':'Studio Dark',exact:true}).click();
    await expect(dialog.getByRole('status')).toBeVisible();
    await page.screenshot({animations:'disabled',path:info.outputPath(`action-mockup-${language}-${width}.png`)});
    await dialog.locator('[data-slot=dialog-close]').click();
    await expect(dialog).toBeHidden();
    expect(downloads).toBe(0); expect(effects).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
