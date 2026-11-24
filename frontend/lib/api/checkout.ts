import { ApiClientError, apiClient } from "./client";
import type { CheckoutRequest, CheckoutResponse } from "@shared/types";
export interface StoredCheckout {
  key: string;
  body: CheckoutRequest;
}
const slot = (customerUserId: string) =>
  `packagepro-checkout-attempt-v1:${customerUserId}`;
export function readCheckout(customerUserId: string): StoredCheckout | null {
  const raw = localStorage.getItem(slot(customerUserId));
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (
    !value ||
    typeof value.key !== "string" ||
    !/^[A-Za-z0-9_.:-]{16,128}$/.test(value.key) ||
    !value.body ||
    typeof value.body !== "object" ||
    !value.body.shippingAddress
  )
    throw new Error(
      "Saved checkout needs review. Do not start another payment.",
    );
  return value;
}
function canonical(value: any): string {
  if (value === undefined || value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
      .join(",") +
    "}"
  );
}
export const checkoutApi = {
  summary: () => apiClient("/checkout/summary", { method: "GET" }),
  recover: (customerUserId: string) => {
    const stored = readCheckout(customerUserId);
    if (!stored) throw new Error("No saved checkout attempt");
    return apiClient<CheckoutResponse>("/checkout/attempt", {
      method: "GET",
      headers: { "Idempotency-Key": stored.key },
    });
  },
  // Only after authenticated recovery returned 404, or confirmed success and cart review.
  forgetUnstarted: (customerUserId: string) =>
    localStorage.removeItem(slot(customerUserId)),
  checkout: async (data: CheckoutRequest, customerUserId: string) => {
    if (!navigator.locks)
      throw new Error(
        "Safe checkout requires browser coordination support. Use a current browser.",
      );
    return navigator.locks.request(slot(customerUserId), async () => {
      let stored = readCheckout(customerUserId);
      if (stored) {
        try {
          await apiClient<CheckoutResponse>("/checkout/attempt", {
            method: "GET",
            headers: { "Idempotency-Key": stored.key },
          });
          // Never silently use a previously saved order for a new cart or edited address.
          throw new Error(
            "A saved checkout exists. Reopen checkout and review that order before paying.",
          );
        } catch (error) {
          if (!(error instanceof ApiClientError && error.status === 404))
            throw error;
        }
        // A verified absent key can use corrected details. Keep the same key so an
        // older tab racing this edit conflicts rather than creating another order.
        stored = { key: stored.key, body: data };
      } else stored = { key: crypto.randomUUID(), body: data };
      localStorage.setItem(slot(customerUserId), JSON.stringify(stored));
      if (canonical(readCheckout(customerUserId)) !== canonical(stored))
        throw new Error("Could not save checkout recovery key");
      return apiClient<CheckoutResponse>("/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": stored.key },
        body: JSON.stringify(stored.body),
      });
    });
  },
};
