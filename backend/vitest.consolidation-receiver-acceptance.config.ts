import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/modules/consolidation/consolidation-receiver-acceptance.integration.test.ts",
    ],
    fileParallelism: false,
    testTimeout: 110000,
    hookTimeout: 30000,
  },
});
