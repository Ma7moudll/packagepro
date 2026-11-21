import {describe,it,expect} from 'vitest';
import {hasUnpricedSpecification,assertSpecificationPriced} from './production-specification';
describe('production quote gate',()=>{
 it.each([null,undefined,{}, {model:{}}, {layers:[]}, {layers:[{type:'text'}]}])('keeps legacy designs orderable: %j',state=>{expect(hasUnpricedSpecification(state)).toBe(false);expect(()=>assertSpecificationPriced(state)).not.toThrow()});
 it.each([{model:{boardSpecification:{version:1}}},{schemaVersion:2,model:{boardSpecification:{outside:'brown-dark',inside:'white-imported-matte'}}},{layers:[{raisedPrint:{text:'word',method:'unspecified'}}]}])('refuses unpriced custom state: %j',state=>{expect(hasUnpricedSpecification(state)).toBe(true);expect(()=>assertSpecificationPriced(state)).toThrow(/QUOTE_REQUIRED/)});
});
