import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "admin-error-ar.spec.ts",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3002",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "NODE_OPTIONS=--max-old-space-size=900 npx next dev -p 3002",
    url: "http://localhost:3002",
    timeout: 90000,
    reuseExistingServer: false,
  },
});
