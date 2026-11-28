import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/modules/finance/admin-currency.unit.test.ts"],
    globals: true,
  },
});
