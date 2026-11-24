import { it, expect, vi } from "vitest";
import { apiClient } from "../../../../frontend/lib/api/client";
it("auth refresh retains original Idempotency-Key and replaces bearer token", async () => {
  const memory = new Map([
    ["accessToken", "old-test-token"],
    ["refreshToken", "synthetic-refresh"],
  ]);
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
    removeItem: (k) => memory.delete(k),
  });
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ status: 401 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { accessToken: "new-test-token", refreshToken: "new-refresh" },
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  vi.stubGlobal("fetch", fetch);
  await apiClient("/checkout", {
    method: "POST",
    headers: { "Idempotency-Key": "synthetic-stable-key" },
    body: "{}",
  });
  expect(fetch.mock.calls[2][1].headers).toMatchObject({
    "Idempotency-Key": "synthetic-stable-key",
    Authorization: "Bearer new-test-token",
  });
  expect(fetch.mock.calls[2][1].body).toBe("{}");
});
