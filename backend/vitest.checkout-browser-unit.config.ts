import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/modules/checkout/saved-payment-amount.unit.test.js",
      "src/modules/checkout/checkout-browser-storage.unit.test.js",
      "src/modules/checkout/checkout-client-headers.unit.test.js",
    ],
    fileParallelism: false,
  },
});
