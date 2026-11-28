import {test, expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
const seed=readFileSync('../backend/prisma/seed.ts','utf8')
function template(name:string){
  const start=seed.indexOf(`const ${name} = {`)
  const begin=seed.indexOf('{',start)
  let depth=0,end=begin
  for(;end<seed.length;end++){
    if(seed[end]==='{')depth++
    else if(seed[end]==='}'&&--depth===0)break
  }
  return new Function(`return (${seed.slice(begin,end+1)})`)()
}
const carton=template('FOLDING_CARTON_DIELINE_TEMPLATE')
for(const language of ['en','ar'])test(`dieline origin fit and honest status ${language}`,async({page},info)=>{
  await page.setViewportSize({width:1280,height:900})
  await page.addInitScript(l=>localStorage.setItem('language',l),language)
  await page.goto('/editor?editorDebug=1')
  await page.waitForFunction(()=>(window as any).__editorStore?.getState().model)
  await page.evaluate(blueprint=>{
    const store=(window as any).__editorStore
    ;(window as any).__qaStore=store
    store.getState().applyCoreState((c:any)=>({...c,model:{...c.model,type:'folding_carton',dimensions:{length:100,width:60,height:30}},product:{id:'prod-product-box',slug:'custom-product-box',boxType:'folding-carton',dieline:blueprint},storedDielineSnapshot:undefined}))
    store.getState().setViewMode('dieline')
  },carton)
  async function fits(){
    const view=await page.locator('[data-dieline-viewport]').boundingBox()
    const sheet=await page.locator('[data-dieline-sheet]').boundingBox()
    return !!view&&!!sheet&&sheet.x>=view.x+15&&sheet.y>=view.y+15&&sheet.x+sheet.width<=view.x+view.width-15&&sheet.y+sheet.height<=view.y+view.height-15
  }
  await expect.poll(fits).toBe(true)
  await expect(page.locator('[data-dieline-status]')).toHaveAttribute('data-dieline-status','fresh')
  await expect(page.getByText(language==='ar'?'مخطط الإنتاج:':'Production dieline:',{exact:false})).toHaveCount(0)
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:language==='ar'?'تصدير':'Export SVG',exact:true}).click()])
  await download.saveAs(info.outputPath(`carton-${language}.svg`))
  await page.screenshot({path:info.outputPath(`carton-${language}.png`)})
  await page.setViewportSize({width:1024,height:800})
  await expect.poll(fits).toBe(true)
  const historical=JSON.parse(readFileSync('tests/fixtures/historical-mailer-enlarged-design.json','utf8'))
  await page.evaluate(old=>{
    const core={...old,storedDielineSnapshot:{geometry:old.manifest.dieline,productId:old.product.id}}
    ;(window as any).__qaStore.getState().applyCoreState(()=>core)
  },historical)
  await expect(page.locator('[data-dieline-stored]')).toContainText(language==='ar'?'التصدير يخضع لفحص الهندسة':'export is subject to geometry checks')
  await expect(page.locator('[data-dieline-stored]')).not.toContainText('exported exactly')
  await expect(page.locator('[data-dieline-overlaps]')).toBeVisible()
  await expect.poll(fits).toBe(true)
  // Geometry changes must not interpolate rectangles away from their paths.
  // Verify actual panel positions, not only the background bounds.
  await expect(page.locator('[data-dieline-viewport] [data-face-id]').first()).not.toHaveClass(/transition-all/)
  await expect.poll(async()=>page.evaluate(expected=>{
    const sheet=document.querySelector('[data-dieline-sheet]')!.getBoundingClientRect()
    const panels=expected.manifest.dieline.panels
    const all=Object.values(panels) as any[]
    const x0=Math.min(...all.map(p=>p.x)),y0=Math.min(...all.map(p=>p.y))
    const x1=Math.max(...all.map(p=>p.x+p.w))
    const scale=sheet.width/(x1-x0)
    return Object.entries(panels).every(([id,p]:any)=>{
      const rect=document.querySelector(`[data-dieline-viewport] [data-face-id="${id}"]`)!.getBoundingClientRect()
      return Math.abs(rect.x-(sheet.x+(p.x-x0)*scale))<1&&Math.abs(rect.y-(sheet.y+(p.y-y0)*scale))<1&&Math.abs(rect.width-p.w*scale)<1&&Math.abs(rect.height-p.h*scale)<1
    })
  },historical)).toBe(true)
  await page.screenshot({path:info.outputPath(`historical-${language}.png`)})
})
