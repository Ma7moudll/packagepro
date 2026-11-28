import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "order-sample-upload.spec.ts",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3004",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "NODE_OPTIONS=--max-old-space-size=1450 npx next dev -p 3004",
    url: "http://localhost:3004",
    timeout: 90000,
    reuseExistingServer: false,
  },
});
