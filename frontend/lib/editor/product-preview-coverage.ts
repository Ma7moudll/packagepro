/** Explicit coverage, never infer geometry from a product's marketing name.
 * Production dieline support is a separate backend contract. */
export type PreviewFamily = "mailer" | "shipping" | "rigid" | "carton" | "pizza" | "cup" | "bag" | "pouch" | "tube" | "envelope" | "label"
const ROUTES: Record<string, PreviewFamily> = {
 "mailer-box":"mailer", "custom-mailer-box":"mailer",
 "shipping-box":"shipping", "custom-shipping-box":"shipping",
 "rigid-box":"rigid", "custom-rigid-box":"rigid", "gift-box":"rigid",
 "folding-carton":"carton", "pizza-box":"pizza", "custom-pizza-box":"pizza",
 "cup":"cup", "paper-cup":"cup", "bag":"bag", "paper-bag":"bag", "carrier-bag":"bag",
 "pouch":"pouch", "stand-up-pouch":"pouch", "doypack":"pouch",
 "tube":"tube", "cardboard-tube":"tube", "envelope":"envelope", "mailer-envelope":"envelope",
 "label":"label", "rectangle-label":"label", "circle-label":"label", "square-label":"label", "labels-sheet":"label",
}
export function productPreviewCoverage(type:string){
 const normalized=type.toLowerCase().replace(/_/g,"-")
 const family=ROUTES[normalized]
 const twoSidedStock=family!==undefined&&["mailer","shipping","rigid","carton","pizza"].includes(family)
 return {normalized,family,geometry:family?"preview":"unavailable",twoSidedStock,selectiveTextRelief:twoSidedStock,productionApproved:false} as const
}
