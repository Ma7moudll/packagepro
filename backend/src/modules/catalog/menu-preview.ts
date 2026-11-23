/** Illustrative white-stock preview, not a supplier color or caliper specification. */
export function menuPreviewStockColour(type:string,material:string):string|undefined{
 return type.replace(/-/g,'_')==='menu_card'&&material==='card-stock-white'?'#e9ecef':undefined
}
/** Two full sheet faces only. The width axis is a preview coordinate, not caliper. */
export function menuPreviewStructure(dimensions:{length:number;width:number;height:number}){
 if(!Object.values(dimensions).every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid menu preview dimensions')
 const {length,width,height}=dimensions
 return {type:'flat',brand:'PackagePro',boxType:'menu-card',defaultSizes:[{code:'default',label:'Menu Card',dims:{...dimensions}}],faces:{front:{width:length,height,depth:width,label:'Front'},back:{width:length,height,depth:width,label:'Back'}},zones:{front:[],back:[]}}
}

/** Preserve every explicit unsupported legacy face, never infer box surfaces. */
export function unsupportedMenuArtwork(type: unknown, layers: readonly { faceId?: unknown }[] | undefined) {
  if (typeof type !== 'string' || type.replace(/-/g, '_') !== 'menu_card' || !layers) return null
  // Match legacy applyCoreState migration: absent/falsy faceId belongs to front.
  // Explicit unsupported IDs are never normalized away.
  const unsupported = layers.filter((l) => { const face = l?.faceId || 'front'; return face !== 'front' && face !== 'back' })
  if (!unsupported.length) return null
  return { faces: [...new Set(unsupported.map((l) => String(l?.faceId ?? 'missing')))].sort(), layerCount: unsupported.length, product: 'menu_card' as const }
}

export function unsupportedMenuOutputMessage(unsupported: { faces: string[]; layerCount: number }) {
  return `This menu card design has ${unsupported.layerCount} artwork layer(s) on surfaces (${unsupported.faces.join(', ')}) that the current preview does not represent. Only front and back artwork are mapped, and the preview is a reference preview only. All artwork remains saved. Open the warning Details to review the saved layer names and surfaces, select a layer in Properties, or explicitly confirm deletion. Undo restores a deleted layer and the output block. PDF, SVG, PNG and JPEG export, the current-face PNG reference, new artwork review creation, certified export and proof generation remain blocked while unsupported artwork exists. No production surface specification is implied.`
}
