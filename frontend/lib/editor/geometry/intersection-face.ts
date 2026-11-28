/** Mailer cap groups are 0 outside / 1 inside / 2 raw cut edge. Other box
 * models retain their existing explicit face metadata. Never pick cut edges. */
export function intersectionFaceId(hit: {object?: {userData?: Record<string, unknown>};face?: {materialIndex?: number}|null}): string|undefined {
 const data=hit.object?.userData
 if(typeof data?.faceId!=="string")return undefined
 if(typeof data.insideFaceId==="string"){
  if(hit.face?.materialIndex===2)return undefined
  if(hit.face?.materialIndex===1)return data.insideFaceId
 }
 return data.faceId
}
