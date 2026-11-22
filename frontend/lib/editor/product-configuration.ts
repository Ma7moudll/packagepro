import {productPreviewCoverage} from './product-preview-coverage.ts'

/** Product-listed candidates are requests, not supplier-certified materials. */
export function productConfiguration(type:string,materials:readonly string[]=[]){
 const c=productPreviewCoverage(type),n=c.normalized
 const boardStock=!!c.family&&['mailer','shipping','rigid','carton','pizza'].includes(c.family)
 const opening=!!c.family&&['mailer','shipping','rigid','carton','pizza','tube','envelope','mailer-bag'].includes(c.family)
 const dimensions:nativeDimension[]=n==='cup'||n==='paper-cup'||n==='smoothie-cup'?
  [{key:'length',en:'Base diameter',ar:'قطر القاعدة'},{key:'width',en:'Rim diameter',ar:'قطر الفوهة'},{key:'height',en:'Height',ar:'الارتفاع'}]:
  c.family==='tube'?[{key:'width',en:'Diameter',ar:'القطر'},{key:'height',en:'Height',ar:'الارتفاع'}]:
  n==='circle-label'?[{key:'length',en:'Diameter',ar:'القطر'}]:
  c.family==='flat'||c.family==='label'?[{key:'length',en:'Width',ar:'العرض'},{key:'height',en:'Height',ar:'الارتفاع'}]:
  [{key:'length',en:'Width',ar:'العرض'},{key:'width',en:'Depth',ar:'العمق'},{key:'height',en:'Height',ar:'الارتفاع'}]
 return {boardStock,opening,dimensions,materials:[...new Set(materials)],supplierConfirmed:false as const}
}
export interface nativeDimension {key:'length'|'width'|'height';en:string;ar:string}
export function productDimensionChange(type:string,current:{length:number;width:number;height:number},key:nativeDimension['key'],value:number){
 const next={...current,[key]:Math.max(1,value||1)},c=productPreviewCoverage(type)
 if(c.family==='tube'&&key==='width')next.length=next.width
 if(c.normalized==='circle-label'&&key==='length')next.height=next.length
 return next
}
export function materialCandidateLabel(code:string){return code.replace(/-/g,' ')}
