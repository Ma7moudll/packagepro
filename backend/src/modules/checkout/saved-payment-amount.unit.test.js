import { it, expect } from "vitest";
import { savedPaymentAmount } from "../../../../frontend/lib/ecommerce/saved-payment-amount";
it("formats explicit currency minor units without defaulting or FX", () => {
  expect(savedPaymentAmount(73.25, "SAR")).toBe("SAR 73.25");
  expect(savedPaymentAmount(73, "JPY")).toBe("JPY 73");
  expect(savedPaymentAmount(73.251, "KWD")).toBe("KWD 73.251");
});
it("nonrepresentable or unavailable amount never silently rounds", () => {
  expect(savedPaymentAmount(73.25, "JPY")).toBeNull();
  expect(savedPaymentAmount(73.251, "SAR")).toBeNull();
  for (const x of [null, NaN, Infinity, "73", -1])
    expect(savedPaymentAmount(x, "SAR")).toBeNull();
  expect(savedPaymentAmount(73, undefined)).toBeNull();
});
