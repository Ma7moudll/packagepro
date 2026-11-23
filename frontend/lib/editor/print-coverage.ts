/** Keep reversible inside artwork reachable when coverage changes after the
 * default, outside-only API configuration has initialized the editor. */
export function withPrintCoverageFaces<T extends {faces:Array<{id:string;name:string}>;printCoverage:string}>(model:T):T {
 if(model.printCoverage==='outside')return model
 const ids=new Set(model.faces.map(face=>face.id))
 const added=model.faces.filter(face=>!face.id.startsWith('inside_')&&!ids.has(`inside_${face.id}`)).map(face=>({...face,id:`inside_${face.id}`,name:`Inside ${face.name}`}))
 return added.length?{...model,faces:[...model.faces,...added]}:model
}

/** Preserve layers in the design, but never print the unselected side. */
export function faceIsPrinted(coverage:string|undefined,faceId:string):boolean {
 const inside=faceId.startsWith('inside_')
 return coverage==='both'||(coverage==='inside'?inside:!inside)
}
