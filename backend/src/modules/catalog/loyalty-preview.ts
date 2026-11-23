/** Illustrative white-stock preview, not a supplier color or caliper specification. */
export function loyaltyPreviewStockColour(type:string,material:string):string|undefined{
 return type.replace(/-/g,'_')==='loyalty_card'&&material==='card-stock-white'?'#e9ecef':undefined
}
/** Two full sheet faces only. The width axis is a preview coordinate, not caliper. */
export function loyaltyPreviewStructure(dimensions:{length:number;width:number;height:number}){
 if(!Object.values(dimensions).every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid loyalty preview dimensions')
 const {length,width,height}=dimensions
 return {type:'flat',brand:'PackagePro',boxType:'loyalty-card',defaultSizes:[{code:'default',label:'Loyalty Card',dims:{...dimensions}}],faces:{front:{width:length,height,depth:width,label:'Front'},back:{width:length,height,depth:width,label:'Back'}},zones:{front:[],back:[]}}
}
