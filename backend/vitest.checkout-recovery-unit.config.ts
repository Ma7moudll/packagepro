import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/integrations/stripe/recovery.unit.test.ts"],
  },
});
