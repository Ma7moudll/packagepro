import { describe,it,expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('F42 browser review Docker build context',()=>{
  it('includes the exact dependency-free contract imported by the frontend',()=>{
    const root=path.resolve(process.cwd(),'..');
    const entry=path.join(root,'frontend/lib/editor/services/artwork-review.ts');
    const source=readFileSync(entry,'utf8');
    const imported=source.match(/from "([^"]*artwork-review-contract)"/);
    expect(imported).not.toBeNull();
    const contract=path.resolve(path.dirname(entry),`${imported![1]}.ts`);
    const relative=path.relative(root,contract).split(path.sep).join('/');
    const docker=readFileSync(path.join(root,'frontend/Dockerfile'),'utf8');
    const builder=docker.split('FROM base AS builder')[1].split('FROM base AS runner')[0];
    expect(builder).toContain(`COPY ${relative} /app/${relative}`);
    expect(builder.indexOf(`COPY ${relative}`)).toBeLessThan(builder.indexOf('RUN npm run build'));
    expect(readFileSync(contract,'utf8')).not.toMatch(/^\s*(?:import\s|export\s.*\sfrom\s)/m);
  });
});
