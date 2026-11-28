import {defineConfig} from 'vitest/config';
// Explicit isolated gate only, never the shared/default CI test environment.
export default defineConfig({test:{environment:'node',include:['src/modules/finance/admin-currency.integration.test.ts'],fileParallelism:false}});
