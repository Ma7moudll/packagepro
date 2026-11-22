import {describe,it,expect} from 'vitest';
import {hasUnpricedSpecification,assertSpecificationPriced} from './production-specification';
describe('production quote gate',()=>{
 it.each([null,undefined,{}, {model:{}}, {layers:[]}, {layers:[{type:'text'}]}])('keeps legacy designs orderable: %j',state=>{expect(hasUnpricedSpecification(state)).toBe(false);expect(()=>assertSpecificationPriced(state)).not.toThrow()});
 it.each([{model:{carrierHandle:'cotton_ropes'}},{model:{materialSpecification:{code:"paper-coated-white",status:"requested"}}},{model:{boardSpecification:{version:1}}},{schemaVersion:2,model:{boardSpecification:{outside:'brown-dark',inside:'white-imported-matte'}}},{layers:[{raisedPrint:{text:'word',method:'unspecified'}}]}])('refuses unpriced custom state: %j',state=>{expect(hasUnpricedSpecification(state)).toBe(true);expect(()=>assertSpecificationPriced(state)).toThrow(/QUOTE_REQUIRED/)});
});

it('inside and both coverage require a quote rather than an outside-only rate', () => {
 for (const printCoverage of ['inside', 'both']) expect(hasUnpricedSpecification({model:{type:'mailer_box',printCoverage}})).toBe(true);
 expect(hasUnpricedSpecification({model:{type:'mailer_box',printCoverage:'outside'}})).toBe(false);
});
