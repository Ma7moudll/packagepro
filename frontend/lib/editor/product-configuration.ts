import {loyaltyPreviewStockColour} from '../../../backend/src/modules/catalog/loyalty-preview.ts'
import {thankYouPreviewStockColour} from '../../../backend/src/modules/catalog/thank-you-preview.ts'
import {ziplockPreviewStockColour} from '../../../backend/src/modules/catalog/ziplock-preview.ts'
import type {DesignCoreState} from './state/types.ts'
import {canonicalEditorType} from '../../../shared/catalog/products.ts'
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
  c.family==='flat'||c.family==='label'||c.family==='ziplock-bag'?[{key:'length',en:'Width',ar:'العرض'},{key:'height',en:'Height',ar:'الارتفاع'}]:
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
const MATERIAL_AR:Record<string,string>={
 'cardboard-kraft':'كرتون كرافت','cardboard-white':'كرتون أبيض','cardboard-coated':'كرتون مطلي','corrugated-kraft':'كرتون مموج كرافت','corrugated-white':'كرتون مموج أبيض',
 'paper-kraft':'ورق كرافت','paper-white':'ورق أبيض','cotton-natural':'قطن طبيعي','cotton-white':'قطن أبيض','mesh-recycled':'نسيج شبكي معاد التدوير','muslin-natural':'قماش موسلين طبيعي',
 'poly-white':'بولي أبيض','poly-black':'بولي أسود','bio-poly':'بولي حيوي','plastic-frosted':'بلاستيك نصف شفاف','foil-matte':'فيلم تغليف مطفي','foil-glossy':'فيلم تغليف لامع','kraft-lined':'كرافت مبطن',
 'compostable':'خامة مقترحة للتحلل العضوي','recyclable-mono':'خامة أحادية مقترحة لإعادة التدوير','paper-coated-white':'ورق أبيض مطلي','plastic-clear':'بلاستيك شفاف','tissue-white':'ورق تغليف خفيف أبيض',
 'kraft-paper':'ورق كرافت','newsprint':'ورق جرائد','paper-tape-kraft':'شريط ورقي كرافت','plastic-tape-clear':'شريط بلاستيك شفاف','kraft-tape':'شريط كرافت','label-paper':'ورق ملصقات','label-vinyl':'فينيل ملصقات',
 'card-stock-white':'ورق كروت أبيض','card-stock-kraft':'ورق كروت كرافت','satin-ribbon':'شريط ساتان','grosgrain-ribbon':'شريط جروسجرين','rubber-stamp':'مطاط أختام',
}
export function materialCandidateLabel(code:string,language='en'){return language==='ar'?(MATERIAL_AR[code]??code.replace(/-/g,' ')):code.replace(/-/g,' ')}
export function readinessLabel(status:string,language='en'){
 const labels:Record<string,[string,string]>={supported:['Available','متاح'],in_progress:['Under review','قيد المراجعة'],unavailable:['Unavailable','غير متاح'],deferred:['Not ready','غير جاهز'],estimated:['Estimate only','تقديري فقط'],quote_required:['Quote required','يتطلب عرض سعر']}
 const l=labels[status];return l?l[language==='ar'?1:0]:status
}
/** One undo step keeps visual stock, requested stock and selected config in sync. */
export function requestProductMaterial(core:DesignCoreState,code:string,candidates:readonly string[]):DesignCoreState{
 if(!candidates.includes(code))return core
 const previousStock=loyaltyPreviewStockColour(core.model.type,core.model.material)??thankYouPreviewStockColour(core.model.type,core.model.material)??ziplockPreviewStockColour(core.model.type,core.model.material)
 const nextStock=loyaltyPreviewStockColour(core.model.type,code)??thankYouPreviewStockColour(core.model.type,code)??ziplockPreviewStockColour(core.model.type,code)
 // Follow a stock-colored canvas, but never overwrite a custom background.
 const canvas=nextStock&&previousStock&&core.canvas?.backgroundColor===previousStock?{...core.canvas,backgroundColor:nextStock}:core.canvas
 return {...core,canvas,model:{...core.model,material:code,boardSpecification:undefined,materialSpecification:{version:1,productType:canonicalEditorType(core.model.type),code,status:'requested',supplierConfirmed:false}},productConfig:core.productConfig?{...core.productConfig,selectedMaterial:code}:undefined}
}
