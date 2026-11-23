import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "admin-currency.spec.ts",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3001",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "NODE_OPTIONS=--max-old-space-size=900 npm run dev",
    url: "http://localhost:3001",
    timeout: 90000,
    reuseExistingServer: false,
  },
});
