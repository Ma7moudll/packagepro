/** Explicit coverage, never infer geometry from a product's marketing name.
 * Production dieline support is a separate backend contract. */
import { sleevePreviewEnabled, snaplockPreviewEnabled, autobottomPreviewEnabled, pillowPreviewEnabled, rigidVariantsPreviewEnabled, stripPreviewEnabled, sewnbagPreviewEnabled, mailerVariantsPreviewEnabled, magneticRigidPreviewEnabled, footprintPreviewEnabled, bottleboxPreviewEnabled, corrugatedEnvelopeUnrouted } from "./preview-flags.ts"
export type PreviewFamily = "mailer" | "shipping" | "rigid" | "carton" | "pizza" | "cup" | "bag" | "pouch" | "tube" | "envelope" | "label" | "flat" | "mailer-bag" | "ziplock-bag" | "sleeve" | "snaplock" | "autobottom" | "pillow" | "strip" | "sewnbag" | "footprint"
const ROUTES: Record<string, PreviewFamily> = {
 "mailer-box":"mailer", "custom-mailer-box":"mailer",
 "shipping-box":"shipping", "custom-shipping-box":"shipping",
 "rigid-box":"rigid", "custom-rigid-box":"rigid", "gift-box":"rigid",
 "folding-carton":"carton", "pizza-box":"pizza", "custom-pizza-box":"pizza",
 "cup":"cup", "paper-cup":"cup", "smoothie-cup":"cup", "bag":"bag", "paper-bag":"bag", "carrier-bag":"bag",
 "doypack-pouch":"pouch", "compostable-doypack":"pouch", "recyclable-doypack":"pouch", "doypack-valve":"pouch",
 "pouch":"pouch", "stand-up-pouch":"pouch", "doypack":"pouch",
 "tube":"tube", "cardboard-tube":"tube", "envelope":"envelope", "mailer-envelope":"envelope",
 "tube-metal-lid":"tube", "corrugated-envelope":"envelope",
 "paper-mailer-bag":"mailer-bag", "poly-mailer":"mailer-bag", "poly-mailer-bag":"mailer-bag", "bio-poly-mailer-bag":"mailer-bag",
 "frosted-ziplock-bag":"ziplock-bag",
 "business-card":"flat", "loyalty-card":"flat", "menu-card":"flat", "thank-you-card":"flat", "tissue-paper":"flat", "packing-paper":"flat",
 "label":"label", "rectangle-label":"label", "circle-label":"label", "square-label":"label", "labels-sheet":"label",
}
const MAILER_VARIANT_PRODUCTS=["ecommerce-mailer-box","christmas-gift-box"]
const MAGNETIC_RIGID_PRODUCTS=["rigid-magnetic-box","rigid-magnetic-cosmetic-box","rigid-magnetic-wine-box"]
const SEWNBAG_PRODUCTS=["cotton-bag","mesh-bag","muslin-bag"]
const STRIP_PRODUCTS=["paper-tape","plastic-tape","water-activated-tape","ribbon"]
const RIGID_VARIANT_PRODUCTS=["rigid-jewellery-box","rigid-cosmetic-box","rigid-wine-box","rigid-flower-box","rigid-shirt-box"]
export function productPreviewCoverage(type:string){
 const normalized=type.toLowerCase().replace(/_/g,"-")
 // Batch T22: the sleeve band preview sits behind its
 // own flag (lib/editor/preview-flags.ts, default off).
 // With the flag off this line changes nothing.
 // Batch T26 addendum: with its flag on, the
 // corrugated-envelope route is removed (see
 // preview-flags.ts); with the flag off, routedFamily
 // is exactly ROUTES[normalized] as before.
 const routedFamily=normalized==="corrugated-envelope"&&corrugatedEnvelopeUnrouted()?undefined:ROUTES[normalized]
 const family=routedFamily??(normalized==="sleeve"&&sleevePreviewEnabled()?"sleeve":normalized==="snap-lock-box"&&snaplockPreviewEnabled()?"snaplock":normalized==="auto-bottom-box"&&autobottomPreviewEnabled()?"autobottom":normalized==="pillow-box"&&pillowPreviewEnabled()?"pillow":RIGID_VARIANT_PRODUCTS.includes(normalized)&&rigidVariantsPreviewEnabled()?"rigid":STRIP_PRODUCTS.includes(normalized)&&stripPreviewEnabled()?"strip":SEWNBAG_PRODUCTS.includes(normalized)&&sewnbagPreviewEnabled()?"sewnbag":MAILER_VARIANT_PRODUCTS.includes(normalized)&&mailerVariantsPreviewEnabled()?"mailer":MAGNETIC_RIGID_PRODUCTS.includes(normalized)&&magneticRigidPreviewEnabled()?"rigid":normalized==="stamp-ink-pad"&&footprintPreviewEnabled()?"footprint":normalized==="bottle-box"&&bottleboxPreviewEnabled()?"snaplock":undefined)
 const paperSurface=family!==undefined&&["mailer","shipping","rigid","carton","pizza","cup","bag","tube","envelope","flat","label","sleeve","snaplock","autobottom","pillow"].includes(family)||normalized==="paper-mailer-bag"
 const actualPaperSurface=paperSurface&&normalized!=="smoothie-cup"
 const twoSidedStock=!!family&&["mailer","shipping","rigid","carton","pizza","snaplock","autobottom"].includes(family)
 return {normalized,family,geometry:family?"preview":"unavailable",twoSidedStock,paperSurface:actualPaperSurface,selectiveTextRelief:!!family&&normalized!=="smoothie-cup",productionApproved:false} as const
}
