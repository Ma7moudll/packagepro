import {menuPreviewStockColour} from '../../../backend/src/modules/catalog/menu-preview.ts';
import {loyaltyPreviewStockColour} from '../../../backend/src/modules/catalog/loyalty-preview.ts'
import {thankYouPreviewStockColour} from '../../../backend/src/modules/catalog/thank-you-preview.ts'
import {ziplockPreviewStockColour} from '../../../backend/src/modules/catalog/ziplock-preview.ts'
import type {DesignCoreState} from './state/types.ts'
import {canonicalEditorType} from '../../../shared/catalog/products.ts'
import {productPreviewCoverage} from './product-preview-coverage.ts'
import {dimensionLabelRelabelEnabled} from './dimension-label-flags.ts'

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
 const shown=dimensionLabelRelabelEnabled()?applyDimensionRelabels(n,c.family,dimensions):dimensions
 return {boardStock,opening,dimensions:shown,materials:[...new Set(materials)],supplierConfirmed:false as const}
}
export interface nativeDimension {key:'length'|'width'|'height';en:string;ar:string}
const STRIP_PRODUCTS=['paper-tape','plastic-tape','water-activated-tape','ribbon']
const SEWN_BAG_PRODUCTS=['cotton-bag','mesh-bag','muslin-bag']
/** Batch T25 — relabels only, behind the dimension-label
 * flag: the strip products' length field is the roll
 * length and their width field is the strip's real width
 * (their height field has no effect); for the envelope,
 * the corrugated envelope and the mailer and sewn bags
 * the depth field has no effect on the routed blank
 * (batch T24's table). stamp_ink_pad is deliberately
 * untouched: its height is recorded and validated. */
export function applyDimensionRelabels(normalized:string,family:string|undefined,dimensions:nativeDimension[]):nativeDimension[]{
 const relabel=(key:nativeDimension['key'],en:string,ar:string)=>dimensions.map(d=>d.key===key?{...d,en,ar}:d)
 if(STRIP_PRODUCTS.includes(normalized)){
  return relabel('length','Roll length','طول اللفة').map(d=>d.key==='width'?{...d,en:'Strip width',ar:'عرض الشريط'}:d).map(d=>d.key==='height'?{...d,en:'Height (unused)',ar:'الارتفاع (غير مستخدم)'}:d)
 }
 if(normalized==='envelope'||normalized==='corrugated-envelope'||family==='mailer-bag'||SEWN_BAG_PRODUCTS.includes(normalized)){
  return relabel('width','Depth (unused)','العمق (غير مستخدم)')
 }
 return dimensions
}
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
 const previousStock=menuPreviewStockColour(core.model.type,core.model.material)??loyaltyPreviewStockColour(core.model.type,core.model.material)??thankYouPreviewStockColour(core.model.type,core.model.material)??ziplockPreviewStockColour(core.model.type,core.model.material)
 const nextStock=menuPreviewStockColour(core.model.type,code)??loyaltyPreviewStockColour(core.model.type,code)??thankYouPreviewStockColour(core.model.type,code)??ziplockPreviewStockColour(core.model.type,code)
 // Follow a stock-colored canvas, but never overwrite a custom background.
 const canvas=nextStock&&previousStock&&core.canvas?.backgroundColor===previousStock?{...core.canvas,backgroundColor:nextStock}:core.canvas
 return {...core,canvas,model:{...core.model,material:code,boardSpecification:undefined,materialSpecification:{version:1,productType:canonicalEditorType(core.model.type),code,status:'requested',supplierConfirmed:false}},productConfig:core.productConfig?{...core.productConfig,selectedMaterial:code}:undefined}
}
