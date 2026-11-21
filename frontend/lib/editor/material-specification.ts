export type LinerId = "brown-dark" | "brown-light" | "white-imported-matte" | "white-imported-gloss" | "kraft-water-resistant"
export interface BoardSpecification {
  version: 1
  outside: LinerId
  inside: LinerId
  coatings: { cellophane: boolean; uv: boolean }
  print: { colourCount: 1 | 4 | "custom"; customColours: string }
}
export const LINERS: {id:LinerId;en:string;ar:string;colour:string;roughness:number}[] = [
  {id:"brown-dark",en:"Dark brown",ar:"بني غامق",colour:"#A8855A",roughness:.92},
  {id:"brown-light",en:"Light brown",ar:"بني فاتح",colour:"#D9C7A8",roughness:.94},
  {id:"white-imported-matte",en:"Imported white, matte",ar:"أبيض مستورد مطفي",colour:"#E9ECEF",roughness:.9},
  {id:"white-imported-gloss",en:"Imported white, glossy",ar:"أبيض مستورد لامع",colour:"#E9ECEF",roughness:.24},
  {id:"kraft-water-resistant",en:"Water-resistant kraft, requested stock",ar:"كرافت عازل للماء، حسب مواصفات الطلب",colour:"#AB885B",roughness:.42},
]
export function initialBoardSpecification(material: string): BoardSpecification {
  const white=material.includes("white")||material.includes("coated")
  const liner:LinerId=white?(material.includes("matte")?"white-imported-matte":"white-imported-gloss"):"brown-dark"
  return {version:1,outside:liner,inside:white?liner:"brown-light",coatings:{cellophane:false,uv:false},print:{colourCount:4,customColours:""}}
}
/** No approved two-sided stock/coating/ink rate card exists yet. Never treat
 * the legacy one-material quote as a complete price for this specification. */
export function requiresBoardQuote(specification: unknown): boolean { return specification !== undefined && specification !== null }
