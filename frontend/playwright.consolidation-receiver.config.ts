import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "consolidation-receiver.spec.ts",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3016",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `NEXT_PUBLIC_CONSOLIDATION_RECEIPTS_ENABLED=${process.env.RECEIVER_TEST_DISABLED === "yes" ? "false" : "true"} NODE_OPTIONS=--max-old-space-size=1450 npx next dev -p 3016`,
    url: "http://localhost:3016",
    timeout: 120000,
    reuseExistingServer: false,
  },
});
