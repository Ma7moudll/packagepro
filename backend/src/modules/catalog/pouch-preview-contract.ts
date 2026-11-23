/** The existing stand-up-pouch renderer maps artwork only to these panels.
 * This is a preview/output safety boundary, not a production surface spec. */
export function unsupportedStandUpPouchArtwork(type:unknown,layers:readonly {faceId?:unknown}[]|undefined){
 if(typeof type!=='string'||type.replace(/-/g,'_')!=='stand_up_pouch'||!layers)return null
 // Match legacy applyCoreState migration: absent/falsy faceId belongs to front.
 // Explicit unsupported IDs are never normalized away.
 const unsupported=layers.filter(l=>{const face=l?.faceId||'front';return face!=='front'&&face!=='back'})
 if(!unsupported.length)return null
 return {faces:[...new Set(unsupported.map(l=>String(l?.faceId??'missing')))].sort(),layerCount:unsupported.length,product:'stand_up_pouch' as const}
}
export function unsupportedPouchOutputMessage(unsupported:{faces:string[];layerCount:number}){
 return `This stand-up pouch design has ${unsupported.layerCount} artwork layer(s) on surfaces (${unsupported.faces.join(', ')}) that the current preview does not represent. Only front and back artwork are mapped. All artwork remains saved and reachable in the editor. Design outputs are blocked until you delete that unsupported artwork. The existing face controls remain available: PDF, SVG, PNG and JPEG export, the current-face PNG reference, new artwork review creation, certified export and proof generation. No production surface specification is implied.`
}
