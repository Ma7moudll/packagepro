import {unsupportedStandUpPouchArtwork,unsupportedPouchOutputMessage} from "../../../backend/src/modules/catalog/pouch-preview-contract.ts"
import { isTwoFaceSheet } from "./geometry/units.ts"

/**
 * Legacy API name retained for sheet consumers. Optional modelType adds only
 * the stand_up_pouch front/back preview-surface boundary; no face data changes.
 * Artwork a two-face sheet cannot represent: layers sitting on inside
 * faces (inside_front / inside_back). A card's preview has no inside
 * surface, so this artwork is preserved in the design data but flagged —
 * the editor shows a notice and proof/export stay blocked until the user
 * moves or removes it. Returns null when there is nothing to flag.
 */
export function unsupportedSheetArtwork(
  faces: readonly { id: string }[] | undefined,
  layers: readonly { faceId: string }[] | undefined,
  modelType?: string
): { faces: string[]; layerCount: number; product?: "stand_up_pouch" } | null {
  const pouch=unsupportedStandUpPouchArtwork(modelType,layers)
  if(pouch)return pouch
  if (!isTwoFaceSheet(faces) || !layers) return null
  const inside = layers.filter((layer) => layer.faceId === "inside_front" || layer.faceId === "inside_back")
  if (inside.length === 0) return null
  return { faces: [...new Set(inside.map((layer) => layer.faceId))].sort(), layerCount: inside.length }
}

/**
 * The one truthful output boundary for unsupported sheet artwork. Derived
 * from the actual design data (layer faceIds against the sheet's faces) —
 * never from the optional manifest flag — and called by every export path
 * before it produces anything: the PDF/SVG/PNG/JPEG design export, the
 * Fabric toolbar's current-face PNG reference, the artwork review
 * download, the certified export, and (mirrored in the backend) proof
 * generation. The message names exactly what is blocked.
 */
export function unsupportedArtworkOutputMessage(unsupported: { faces: string[]; layerCount: number; product?: "stand_up_pouch" }): string {
  if(unsupported.product==='stand_up_pouch')return unsupportedPouchOutputMessage(unsupported)
  return `This card design has ${unsupported.layerCount} artwork layer(s) on inside faces (${unsupported.faces.join(", ")}), which this preview does not support. The artwork is preserved in the design and the design still saves, but every design output is blocked until you move or remove that artwork: PDF, SVG, PNG and JPEG export, the current-face PNG reference, the artwork review download, certified export and proof generation.`
}

/** Throw the shared block message when the design carries unsupported sheet artwork. */
export function assertNoUnsupportedSheetArtwork(
  faces: readonly { id: string }[] | undefined,
  layers: readonly { faceId: string }[] | undefined,
  modelType?: string
): void {
  const unsupported = unsupportedSheetArtwork(faces, layers, modelType)
  if (unsupported) throw new Error(`Export blocked: ${unsupportedArtworkOutputMessage(unsupported)}`)
}

/** Keep reversible inside artwork reachable when coverage changes after the
 * default, outside-only API configuration has initialized the editor. */
export function withPrintCoverageFaces<T extends {faces:Array<{id:string;name:string}>;printCoverage:string}>(model:T, layers?: readonly {faceId:string}[]):T {
 // Two-face sheets (the business card) have no inside surface — front and
 // back ARE the two sides of the sheet, so inside coverage is unsupported
 // for them. Restored or crafted data can still carry coverage "inside" or
 // "both" (and the inside_front/inside_back faces it adds).
 if (isTwoFaceSheet(model.faces)) {
  // If the design carries artwork on inside faces, preserve the restored
  // data exactly — faces and coverage value untouched — so no artwork is
  // silently dropped or hidden. The design is flagged instead (editor
  // notice, a manifest flag, and blocked proof/export) until the user
  // resolves it. See unsupportedSheetArtwork.
  if (unsupportedSheetArtwork(model.faces, layers)) return model
  // No inside artwork exists, so nothing can be lost: normalize the sheet
  // to its structure's two faces with outside coverage, here in the one
  // place every state replacement flows through, so the stored coverage
  // value, the face list, the store's canvas resync and the saved
  // manifest — all keyed on isTwoFaceSheet — agree.
  const faces = model.faces.filter(face => face.id === "front" || face.id === "back")
  if (faces.length === model.faces.length && model.printCoverage === "outside") return model
  return {...model, faces, printCoverage: "outside"}
 }
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
