import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "sample-review.spec.ts",
  workers: 1,
  timeout: 60000,
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
  webServer: {
    command: "NODE_OPTIONS=--max-old-space-size=900 npm run dev",
    url: "http://localhost:3001",
    timeout: 90000,
    reuseExistingServer: false,
  },
});
