import {readFileSync,readdirSync} from 'node:fs'
import {resolve} from 'node:path'
import ts from 'typescript'
import {CATALOGUE_PRODUCTS} from '../../shared/catalog/products.ts'
import {productPreviewCoverage} from '../lib/editor/product-preview-coverage.ts'

/** Repository intent only. No environment, supplier or deployment inference. */
export function catalogueCapabilitySnapshot(root:string){
 const counts=(key:'preview'|'dieline'|'pricing')=>{
  const totals:Record<string,number>={}
  for(const p of CATALOGUE_PRODUCTS)totals[p.readiness[key]]=(totals[p.readiness[key]]??0)+1
  return Object.entries(totals).sort(([a],[b])=>a.localeCompare(b)).map(([k,n])=>`${k}: ${n}`).join(', ')
 }
 const modules=readdirSync(resolve(root,'backend/src/modules'),{withFileTypes:true}).filter(d=>d.isDirectory()).length
 const schema=readFileSync(resolve(root,'backend/prisma/schema.prisma'),'utf8')
 const models=[...schema.matchAll(/^model\s+\w+\s*\{/gm)].length
 const fe=JSON.parse(readFileSync(resolve(root,'frontend/package.json'),'utf8'))
 const be=JSON.parse(readFileSync(resolve(root,'backend/package.json'),'utf8'))
 const templateSource=ts.createSourceFile('templates.ts',readFileSync(resolve(root,'frontend/lib/editor/data/templates.ts'),'utf8'),ts.ScriptTarget.Latest,true)
 let presets=0
 templateSource.forEachChild(node=>{if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)if(declaration.name.getText(templateSource)==='TEMPLATES'&&declaration.initializer&&ts.isArrayLiteralExpression(declaration.initializer))presets=declaration.initializer.elements.length})
 const rows=CATALOGUE_PRODUCTS.map(p=>{
  const route=productPreviewCoverage(p.id).family??'none'
  return `| ${p.id} | ${p.readiness.preview} | ${route} | ${p.readiness.dieline} | ${p.readiness.pricing} |`
 })
 return [
  `Catalogue entries: ${CATALOGUE_PRODUCTS.length}; starting-point design presets: ${presets}.`,
  '',
  `Preview: ${counts('preview')}.`,
  '',
  `Production dieline: ${counts('dieline')}.`,
  '',
  `Pricing: ${counts('pricing')}.`,
  '',
  `Backend source: ${modules} module directories, ${models} Prisma model declarations. These are code counts, not operational coverage.`,
  '',
  `Declared dependencies: Fastify ${be.dependencies.fastify}; Next.js ${fe.dependencies.next}; React ${fe.dependencies.react}.`,
  '',
  '| Product ID | Registry preview | Renderer route | Production dieline | Pricing |',
  '|---|---|---|---|---|',...rows,
 ].join('\n')
}
