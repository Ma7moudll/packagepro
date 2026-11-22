import {getCatalogueProduct,getCatalogueProductByBoxType,getCatalogueProductBySlug,canonicalEditorType} from '../../../shared/catalog/products.ts'
export function editorRequiresQuote(s:{model:{type:string;boardSpecification?:unknown;materialSpecification?:unknown;carrierHandle?:unknown};layers:Array<{raisedPrint?:unknown}>}){
 const n=s.model.type.toLowerCase().replace(/_/g,'-')
 const p=getCatalogueProduct(canonicalEditorType(s.model.type))||getCatalogueProductByBoxType(n)||getCatalogueProductBySlug(n)
 return !p||p.readiness.pricing==='quote_required'||s.model.carrierHandle!=null||s.model.materialSpecification!=null||s.model.boardSpecification!=null||s.layers.some(l=>l.raisedPrint!=null)
}
