import type {DesignCoreState} from './state/types'

function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical)
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]))
 return value
}
/** Compare authored content across an async save/cart handoff. A cloud reload
 * may replace object identities and normalize the selected canvas extent.
 * Neither that nor selection/camera changes is a new artwork revision.
 * This is a local content fingerprint, not a server revision/locking token. */
export function cartDesignFingerprint(state:DesignCoreState):string{
 return JSON.stringify(canonical({model:state.model,layers:state.layers,background:{colour:state.canvas.backgroundColor,image:state.canvas.backgroundImage},product:state.product,productConfig:state.productConfig,zones:state.zones,structureType:state.structureType,lifecycleStatus:state.lifecycleStatus}))
}
