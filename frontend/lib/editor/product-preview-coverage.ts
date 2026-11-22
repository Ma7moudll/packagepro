/** Explicit coverage, never infer geometry from a product's marketing name.
 * Production dieline support is a separate backend contract. */
export type PreviewFamily = "mailer" | "shipping" | "rigid" | "carton" | "pizza" | "cup" | "bag" | "pouch" | "tube" | "envelope" | "label" | "flat" | "mailer-bag"
const ROUTES: Record<string, PreviewFamily> = {
 "mailer-box":"mailer", "custom-mailer-box":"mailer",
 "shipping-box":"shipping", "custom-shipping-box":"shipping",
 "rigid-box":"rigid", "custom-rigid-box":"rigid", "gift-box":"rigid",
 "folding-carton":"carton", "pizza-box":"pizza", "custom-pizza-box":"pizza",
 "cup":"cup", "paper-cup":"cup", "bag":"bag", "paper-bag":"bag", "carrier-bag":"bag",
 "doypack-pouch":"pouch", "compostable-doypack":"pouch", "recyclable-doypack":"pouch", "doypack-valve":"pouch",
 "pouch":"pouch", "stand-up-pouch":"pouch", "doypack":"pouch",
 "tube":"tube", "cardboard-tube":"tube", "envelope":"envelope", "mailer-envelope":"envelope",
 "tube-metal-lid":"tube", "corrugated-envelope":"envelope",
 "paper-mailer-bag":"mailer-bag", "poly-mailer":"mailer-bag", "poly-mailer-bag":"mailer-bag", "bio-poly-mailer-bag":"mailer-bag",
 "business-card":"flat", "loyalty-card":"flat", "menu-card":"flat", "thank-you-card":"flat", "tissue-paper":"flat", "packing-paper":"flat",
 "label":"label", "rectangle-label":"label", "circle-label":"label", "square-label":"label", "labels-sheet":"label",
}
export function productPreviewCoverage(type:string){
 const normalized=type.toLowerCase().replace(/_/g,"-")
 const family=ROUTES[normalized]
 const paperSurface=family!==undefined&&["mailer","shipping","rigid","carton","pizza","cup","bag","tube","envelope","flat","label"].includes(family)||normalized==="paper-mailer-bag"
 const twoSidedStock=!!family&&["mailer","shipping","rigid","carton","pizza"].includes(family)
 return {normalized,family,geometry:family?"preview":"unavailable",twoSidedStock,paperSurface,selectiveTextRelief:!!family,productionApproved:false} as const
}
