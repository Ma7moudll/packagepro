import { beforeEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../../../../frontend/lib/api/client", () => ({
  apiClient: mock.api,
  ApiClientError: class extends Error {
    constructor(status, code, message) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));
import {
  checkoutApi,
  readCheckout,
} from "../../../../frontend/lib/api/checkout";
import { ApiClientError } from "../../../../frontend/lib/api/client";
const user = "qa-user",
  slot = "packagepro-checkout-attempt-v1:qa-user";
const data = {
  shippingAddress: {
    name: "QA",
    phone: "test",
    street: "Test",
    city: "Cairo",
    postalCode: "00000",
    country: "EG",
  },
};
let memory;
beforeEach(() => {
  memory = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: (key) => memory.delete(key),
  });
  vi.stubGlobal("navigator", { locks: { request: async (_key, fn) => fn() } });
  mock.api.mockReset();
});
it.each(["{", "null", "[]", '{"key":"short","body":{}}'])(
  "malformed saved checkout fails closed without network %s",
  async (raw) => {
    memory.set(slot, raw);
    await expect(checkoutApi.checkout(data, user)).rejects.toThrow();
    expect(mock.api).not.toHaveBeenCalled();
    expect(memory.get(slot)).toBe(raw);
  },
);
it("old key never silently submits old order against new cart or changed address", async () => {
  memory.set(slot, JSON.stringify({ key: "qa-existing-checkout", body: data }));
  mock.api.mockResolvedValue({ success: true, data: { orderId: "old-order" } });
  await expect(
    checkoutApi.checkout({ ...data, notes: "new cart intent" }, user),
  ).rejects.toThrow("saved checkout");
  expect(mock.api).toHaveBeenCalledTimes(1);
  expect(mock.api.mock.calls[0][1].method).toBe("GET");
});
it("verified absent key permits corrected address with same durable key", async () => {
  memory.set(slot, JSON.stringify({ key: "qa-existing-checkout", body: data }));
  mock.api
    .mockRejectedValueOnce(new ApiClientError(404, "NOT_FOUND", "absent"))
    .mockResolvedValueOnce({ success: true, data: { orderId: "new-order" } });
  await checkoutApi.checkout({ ...data, notes: "corrected" }, user);
  expect(mock.api.mock.calls[1][1].headers["Idempotency-Key"]).toBe(
    "qa-existing-checkout",
  );
  expect(readCheckout(user)?.body.notes).toBe("corrected");
});
it("unavailable recovery is not permission to discard a key", async () => {
  memory.set(slot, JSON.stringify({ key: "qa-existing-checkout", body: data }));
  mock.api.mockRejectedValue(
    new ApiClientError(503, "UNAVAILABLE", "try later"),
  );
  await expect(checkoutApi.checkout(data, user)).rejects.toThrow();
  expect(mock.api).toHaveBeenCalledTimes(1);
});
it("persists key before first request and storage failure forbids request", async () => {
  mock.api.mockImplementation(async () => {
    expect(readCheckout(user)?.key).toBeTruthy();
    return { success: true };
  });
  await checkoutApi.checkout(data, user);
  expect(mock.api).toHaveBeenCalledTimes(1);
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  });
  mock.api.mockClear();
  await expect(checkoutApi.checkout(data, user)).rejects.toThrow("quota");
  expect(mock.api).not.toHaveBeenCalled();
});
it("same-browser concurrent checkout serializes and second tab recovers instead of POST", async () => {
  let queue = Promise.resolve();
  vi.stubGlobal("navigator", {
    locks: {
      request: (_key, fn) => {
        const result = queue.then(fn);
        queue = result.catch(() => {});
        return result;
      },
    },
  });
  mock.api.mockResolvedValue({ success: true, data: { orderId: "qa-order" } });
  const results = await Promise.allSettled([
    checkoutApi.checkout(data, user),
    checkoutApi.checkout(data, user),
  ]);
  expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
  expect(
    mock.api.mock.calls.filter((c) => c[1].method === "POST"),
  ).toHaveLength(1);
  expect(mock.api.mock.calls.filter((c) => c[1].method === "GET")).toHaveLength(
    1,
  );
});
it("browser without cross-tab coordination cannot dispatch", async () => {
  vi.stubGlobal("navigator", {});
  await expect(checkoutApi.checkout(data, user)).rejects.toThrow(
    "coordination",
  );
  expect(mock.api).not.toHaveBeenCalled();
});
