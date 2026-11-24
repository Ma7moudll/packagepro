import {defineConfig} from 'vitest/config';
// Isolated HTTP + real JWT gate. Prisma is fixture-only; no DB/Redis/provider access.
export default defineConfig({test:{environment:'node',include:['src/modules/finance/financial-summary-access.test.ts']}});
