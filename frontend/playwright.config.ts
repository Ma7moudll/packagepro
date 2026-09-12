import { defineConfig, devices } from "@playwright/test"
import path from "node:path"

const frontendDir = __dirname
const backendDir = path.resolve(frontendDir, "../backend")
const preflight = path.join(frontendDir, "scripts/e2e-preflight.mjs")

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: [
    {
      command: `node "${preflight}" && npm run build && npm start`,
      cwd: backendDir,
      url: "http://localhost:3000/health",
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `node "${preflight}" && npm run build && npm start`,
      cwd: frontendDir,
      url: "http://localhost:3001/",
      timeout: 300_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
})