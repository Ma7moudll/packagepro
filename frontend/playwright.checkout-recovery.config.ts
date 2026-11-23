import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "checkout-recovery.spec.ts",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
  webServer: {
    command:
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_synthetic_contract_only NODE_OPTIONS=--max-old-space-size=900 npm run dev",
    url: "http://localhost:3001",
    timeout: 90000,
    reuseExistingServer: false,
  },
});
