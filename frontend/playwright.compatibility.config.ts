import { defineConfig, devices } from '@playwright/test'

// Frontend-only compatibility smoke. SKU entry is local state and needs no
// production credentials, database, payment provider or external mutation.
export default defineConfig({
  testDir: './e2e',
  testMatch: ['fabric-compatibility.spec.ts', 'mobile-layout.spec.ts', 'editor-layout.spec.ts', 'editor-action-honesty.spec.ts'],
  workers: 1,
  timeout: 90_000,
  expect: {timeout: 20_000},
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']},
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3001',
    timeout: 60_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
