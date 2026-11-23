import {defineConfig, devices} from '@playwright/test'

// Manual local integration gate. Requires a migrated, seeded disposable local
// packagepro_e2e_* database, test email transport and real API on port 3000.
// The local-customer fixture refuses non-local/non-disposable database targets.
export default defineConfig({
  testDir:'./e2e',
  testMatch:'dieline-history.integration.spec.ts',
  workers:1,
  timeout:90000,
  expect:{timeout:15000},
  reporter:'list',
  use:{...devices['Desktop Chrome'],baseURL:'http://localhost:3001',trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npm start',url:'http://localhost:3001',reuseExistingServer:false},
})
