import {it,expect} from 'vitest';
import {approvalFrontendBase} from './approval.service';
it('production approval links require HTTPS; local test/development HTTP and configured subpath remain supported',()=>{
 expect(()=>approvalFrontendBase('http://example.test',true)).toThrow(/configured safely/);
 expect(approvalFrontendBase('https://example.test/store/',true)).toBe('https://example.test/store');
 expect(approvalFrontendBase('http://localhost:3001/',false)).toBe('http://localhost:3001');
});
