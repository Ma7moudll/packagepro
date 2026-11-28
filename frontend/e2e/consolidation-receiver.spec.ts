import { test, expect, Page } from "@playwright/test";
const fixture = (current = true, receiptRevision = 0) => ({
  orderId: "synthetic-order",
  hubId: "synthetic-hub",
  manifest: {
    revision: 1,
    receiptRevision,
    current,
    allocations: [
      {
        id: "part-a",
        orderItemId: "item-a",
        poId: "po-a",
        unit: "piece",
        required: 100,
      },
    ],
  },
  receipts: receiptRevision
    ? [
        {
          id: "event-a",
          manifestRevision: 1,
          receiptRevision: 1,
          allocationId: "part-a",
          snapshot: { received: 100, accepted: 100, rejected: 0 },
        },
      ]
    : [],
  receiptPage: { hasMore: false, nextAfter: null as number | null },
});
async function setup(page: Page, language = "en", mode = "ok") {
  const posts: any[] = [];
  let reads = 0;
  await page.addInitScript((l) => {
    localStorage.setItem("language", l);
    localStorage.setItem(
      "accessToken",
      "synthetic." +
        btoa(
          JSON.stringify({
            userId: "synthetic-receiver",
            sub: "synthetic-receiver",
          }),
        ) +
        ".unsigned-fixture",
    );
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "synthetic-receiver",
        name: "QA Receiver",
        email: "receiver@test.invalid",
        role: "TRADER",
      }),
    );
  }, language);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/consolidation/")) {
      if (route.request().method() === "POST") {
        posts.push(route.request().postDataJSON());
        if (mode === "uncertain" && posts.length === 1) return route.abort();
        if (mode === "conflict")
          return route.fulfill({
            status: 409,
            json: { success: false, error: "CONFLICT" },
          });
        if (mode === "false")
          return route.fulfill({ json: { success: false, error: "ERROR" } });
        return route.fulfill({
          json: { success: true, data: { id: "event-a" } },
        });
      }
      if (path.endsWith("/eligibility"))
        return route.fulfill({
          json: {
            success: true,
            data: {
              eligible: mode === "stale",
              manifestRevision: 1,
              receiptRevision: posts.length,
            },
          },
        });
      reads++;
      if (mode === "denied")
        return route.fulfill({
          status: 403,
          json: { success: false, error: "AUTHORIZATION_ERROR" },
        });
      if (mode === "refreshfail" && reads > 1)
        return route.fulfill({
          status: 500,
          json: { success: false, error: "INTERNAL_ERROR" },
        });
      return route.fulfill({
        json: { success: true, data: fixture(mode !== "stale", posts.length) },
      });
    }
    if (path === "/api/cart")
      return route.fulfill({
        json: {
          success: true,
          data: { items: [], summary: { total: 0, subtotal: 0, itemCount: 0 } },
        },
      });
    if (path.endsWith("/analytics/stream"))
      return route.fulfill({ contentType: "text/event-stream", body: "" });
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.goto("/receiving");
  await page
    .getByLabel(language === "ar" ? "معرّف الطلب" : "Order ID", { exact: true })
    .fill("synthetic-order");
  await page
    .getByLabel(language === "ar" ? "معرّف التجميع" : "Hub ID", { exact: true })
    .fill("synthetic-hub");
  await page
    .getByRole("button", {
      name:
        language === "ar" ? "فتح مساحة الاستلام" : "Open receiver workspace",
    })
    .click();
  return { posts, reads: () => reads };
}
async function fill(page: Page) {
  await page
    .getByText("I reconciled the refreshed ledger", { exact: false })
    .click();
  await page.getByLabel("Allocation", { exact: true }).selectOption("part-a");
  for (const name of ["Received", "Accepted"])
    await page.getByLabel(name, { exact: true }).fill("100");
  await page.getByLabel("Rejected", { exact: true }).fill("0");
  await page
    .getByLabel("Review / correction reason", { exact: true })
    .fill("Synthetic local review");
}
test("manual read, uncertain receipt retry persists exact envelope across reload", async ({
  page,
}) => {
  const state = await setup(page, "en", "uncertain");
  expect(state.reads()).toBe(0);
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await fill(page);
  await page.getByRole("button", { name: "Save receipt review" }).click();
  await expect(
    page.getByText("Saved unresolved request", { exact: true }),
  ).toBeVisible();
  expect(state.posts).toHaveLength(1);
  await page.reload();
  await page.getByLabel("Order ID", { exact: true }).fill("synthetic-order");
  await page.getByLabel("Hub ID", { exact: true }).fill("synthetic-hub");
  await page.getByRole("button", { name: "Open receiver workspace" }).click();
  await page.getByRole("button", { name: "Retry exact saved request" }).click();
  await expect(page.getByRole("status")).toContainText("Server acknowledged");
  expect(state.posts).toHaveLength(2);
  expect(state.posts[1]).toEqual(state.posts[0]);
  await expect(
    page.getByRole("button", { name: "Confirm reviewed parts" }),
  ).toHaveCount(0);
});
for (const mode of ["conflict", "false", "refreshfail"])
  test(
    mode + " is not false success or current after mutation",
    async ({ page }) => {
      const state = await setup(page, "en", mode);
      await page.getByRole("button", { name: "Refresh current facts" }).click();
      await fill(page);
      await page.getByRole("button", { name: "Save receipt review" }).click();
      if (mode !== "refreshfail") {
        await expect(
          page.getByText("Saved unresolved request", { exact: true }),
        ).toBeVisible();
        await expect(page.getByRole("status")).not.toContainText(
          "Server acknowledged",
        );
      } else {
        await expect(page.getByRole("status")).toContainText(
          "Server acknowledged",
        );
        await page
          .getByRole("button", { name: "Refresh current facts" })
          .click();
        await expect(page.getByRole("status")).toContainText("Refresh failed");
      }
      await expect(
        page.getByRole("button", { name: "Confirm reviewed parts" }),
      ).toBeDisabled();
      expect(state.posts).toHaveLength(1);
    },
  );
test("stale snapshot cannot claim eligibility or submit", async ({ page }) => {
  await setup(page, "en", "stale");
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await expect(
    page.getByText(
      "Source changed. Replanning required. Receiving and confirmation blocked.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save receipt review" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Allocation", { exact: true })).toBeDisabled();
  await expect(
    page.getByText("Team confirmation observed. Not a shipping reservation."),
  ).toHaveCount(0);
});
for (const language of ["en", "ar"])
  for (const width of [320, 390, 1440])
    test(`pixels ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const state = await setup(page, language);
      await page
        .getByRole("button", {
          name:
            language === "ar"
              ? "تحديث البيانات الحالية"
              : "Refresh current facts",
        })
        .click();
      await expect(
        page.getByText(
          language === "ar"
            ? "حالية وقت آخر قراءة يدوية."
            : "Current at last manual read.",
        ),
      ).toBeVisible();
      expect(
        await page.evaluate(() =>
          Array.from(document.querySelectorAll("body *"))
            .filter(
              (e) =>
                e.getBoundingClientRect().right > innerWidth + 1 &&
                getComputedStyle(e).position !== "fixed",
            )
            .map((e) => ({
              tag: e.tagName,
              cls: e.className,
              right: e.getBoundingClientRect().right,
            }))
            .slice(0, 12),
        ),
      ).toEqual([]);
      const n = state.reads();
      await page.waitForTimeout(1000);
      expect(state.reads()).toBe(n);
      await page.screenshot({
        path: `/downloads/receiver-ui/${language}-${width}.png`,
        fullPage: true,
      });
    });

test("confirmation needs refreshed complete counts and an explicit review, no automatic postcommit read", async ({
  page,
}) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await expect(page.getByRole("checkbox").last()).toBeDisabled();
  await fill(page);
  await page.getByRole("button", { name: "Save receipt review" }).click();
  await expect(page.getByRole("status")).toContainText("Server acknowledged");
  expect(state.reads()).toBe(1);
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await page
    .getByText("I reconciled the refreshed ledger", { exact: false })
    .click();
  await page.getByRole("checkbox").last().check();
  await page.getByRole("button", { name: "Confirm reviewed parts" }).click();
  await expect(page.getByRole("status")).toContainText("Server acknowledged");
  expect(state.posts[1]).toEqual({ manifestRevision: 1, receiptRevision: 1 });
  expect(state.reads()).toBe(2);
  await expect(page.getByRole("checkbox").last()).not.toBeChecked();
});
test("receiver denial never shows data or mutation controls", async ({
  page,
}) => {
  const state = await setup(page, "en", "denied");
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await expect(page.getByRole("status")).toContainText("Refresh failed");
  await expect(
    page.getByRole("button", { name: "Save receipt review" }),
  ).toHaveCount(0);
  expect(state.posts).toHaveLength(0);
});
test("retry persistence failure prevents the first send", async ({ page }) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await fill(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw Error("Synthetic unavailable storage");
    };
  });
  await page.getByRole("button", { name: "Save receipt review" }).click();
  await expect(page.getByRole("status")).toContainText("Nothing sent");
  expect(state.posts).toHaveLength(0);
});

for (const language of ["en", "ar"])
  test("focused input unobscured " + language, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await setup(page, language);
    await page
      .getByRole("button", {
        name:
          language === "ar"
            ? "تحديث البيانات الحالية"
            : "Refresh current facts",
      })
      .click();
    await page
      .getByText(
        language === "ar"
          ? "طابقت السجل المحدّث"
          : "I reconciled the refreshed ledger",
        { exact: false },
      )
      .click();
    const input = page.getByLabel(language === "ar" ? "المستلم" : "Received", {
      exact: true,
    });
    await input.fill("100");
    await input.focus();
    await input.evaluate((e) => e.scrollIntoView({ block: "center" }));
    expect(
      await input.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return (
          document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          ) === e
        );
      }),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Open support", exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: "/downloads/receiver-ui/" + language + "-focus-320.png",
    });
  });
test("history pages cannot silently change revisions or unlock confirmation", async ({
  page,
}) => {
  await setup(page);
  await page.route(
    "**/api/consolidation/orders/synthetic-order/eligibility",
    (r) =>
      r.fulfill({
        json: {
          success: true,
          data: { eligible: false, manifestRevision: 1, receiptRevision: 1 },
        },
      }),
  );
  let continuation = false;
  await page.route(
    "**/api/consolidation/orders/synthetic-order?*",
    async (route) => {
      continuation = new URL(route.request().url()).searchParams.has("after");
      const data = fixture(true, continuation ? 2 : 1);
      data.receiptPage = {
        hasMore: !continuation,
        nextAfter: continuation ? null : 1,
      };
      if (continuation) data.manifest.revision = 2;
      return route.fulfill({ json: { success: true, data } });
    },
  );
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await expect(page.getByRole("checkbox").last()).toBeDisabled();
  await page.getByRole("button", { name: "Load remaining history" }).click();
  await expect(page.getByRole("status")).toContainText("History changed");
  await expect(
    page.getByRole("button", { name: "Save receipt review" }),
  ).toBeDisabled();
});

test("valid history continuation completes the reviewed snapshot", async ({
  page,
}) => {
  await setup(page);
  await page.route(
    "**/api/consolidation/orders/synthetic-order/eligibility",
    (r) =>
      r.fulfill({
        json: {
          success: true,
          data: { eligible: false, manifestRevision: 1, receiptRevision: 2 },
        },
      }),
  );
  await page.route("**/api/consolidation/orders/synthetic-order?*", (r) => {
    const after = new URL(r.request().url()).searchParams.has("after"),
      data = fixture(true, 2);
    data.receipts = [
      {
        ...data.receipts[0],
        id: after ? "event-b" : "event-a",
        receiptRevision: after ? 2 : 1,
      },
    ];
    data.receiptPage = { hasMore: !after, nextAfter: after ? null : 1 };
    return r.fulfill({ json: { success: true, data } });
  });
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await page.getByRole("button", { name: "Load remaining history" }).click();
  await page
    .getByText("I reconciled the refreshed ledger", { exact: false })
    .click();
  await expect(page.getByRole("checkbox").last()).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Load remaining history" }),
  ).toHaveCount(0);
});

test("default-off UI makes no consolidation request", async ({ page }) => {
  test.skip(process.env.RECEIVER_TEST_DISABLED !== "yes");
  let count = 0;
  await page.route("**/api/**", (r) => {
    if (r.request().url().includes("/consolidation/")) count++;
    return r.fulfill({
      json: { success: true, data: { items: [], summary: { total: 0 } } },
    });
  });
  await page.goto("/receiving");
  await expect(
    page.getByRole("heading", { name: "Receiving review is disabled" }),
  ).toBeVisible();
  expect(count).toBe(0);
});

test("cross-tab token replacement cannot send old-scope request as new actor", async ({
  page,
}) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await fill(page);
  await page.evaluate(() =>
    localStorage.setItem(
      "accessToken",
      "synthetic." +
        btoa(
          JSON.stringify({ userId: "different-actor", sub: "different-actor" }),
        ) +
        ".fixture",
    ),
  );
  await page.getByRole("button", { name: "Save receipt review" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Session identity changed",
  );
  expect(state.posts).toHaveLength(0);
});
test("eligibility failure blocks new writes and is explicit", async ({
  page,
}) => {
  await setup(page);
  await page.route(
    "**/api/consolidation/orders/synthetic-order/eligibility",
    (r) => r.fulfill({ status: 500, json: { success: false } }),
  );
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Eligibility check failed",
  );
  await expect(page.getByLabel("Allocation", { exact: true })).toBeDisabled();
});

test("actual outgoing header stays actor-bound when storage switches midflight", async ({
  page,
}) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await fill(page);
  let authorization = "";
  await page.route(
    "**/api/consolidation/orders/synthetic-order/receipts",
    async (r) => {
      authorization = r.request().headers().authorization;
      await page.evaluate(() =>
        localStorage.setItem(
          "accessToken",
          "synthetic." +
            btoa(JSON.stringify({ userId: "new-actor", sub: "new-actor" })) +
            ".fixture",
        ),
      );
      return r.fulfill({ json: { success: true, data: { id: "ack" } } });
    },
  );
  await page.getByRole("button", { name: "Save receipt review" }).click();
  await expect(page.getByRole("status")).toContainText("Outcome uncertain");
  const token = authorization.slice(7);
  expect(
    JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).userId,
  ).toBe("synthetic-receiver");
  await expect(
    page.getByText("Saved unresolved request", { exact: true }),
  ).toBeVisible();
  expect(state.posts).toHaveLength(0);
});
test("lost tab retry requires authoritative read and explicit reconciliation before new envelope", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await expect(page.getByLabel("Allocation", { exact: true })).toBeDisabled();
  await page
    .getByText("I reconciled the refreshed ledger", { exact: false })
    .click();
  await expect(page.getByLabel("Allocation", { exact: true })).toBeEnabled();
  await page.reload();
  await page.getByLabel("Order ID", { exact: true }).fill("synthetic-order");
  await page.getByLabel("Hub ID", { exact: true }).fill("synthetic-hub");
  await page.getByRole("button", { name: "Open receiver workspace" }).click();
  await expect(page.getByLabel("Allocation", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await expect(page.getByLabel("Allocation", { exact: true })).toBeDisabled();
  await page
    .getByText("I reconciled the refreshed ledger", { exact: false })
    .click();
  await expect(page.getByLabel("Allocation", { exact: true })).toBeEnabled();
});

test("expired session requires explicit verified sameactor renewal and retains exact uncertain envelope", async ({
  page,
}) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await fill(page);
  const requests: any[] = [];
  let expired = true;
  await page.route(
    "**/api/consolidation/orders/synthetic-order/receipts",
    (r) => {
      requests.push(r.request().postDataJSON());
      return r.fulfill({
        status: expired ? 401 : 200,
        json: expired
          ? { success: false, error: "AUTHENTICATION_ERROR" }
          : { success: true, data: { id: "ack" } },
      });
    },
  );
  await page.getByRole("button", { name: "Save receipt review" }).click();
  await expect(page.getByRole("status")).toContainText("Session expired");
  await page.evaluate(() =>
    localStorage.setItem(
      "accessToken",
      "renewed." +
        btoa(
          JSON.stringify({
            userId: "synthetic-receiver",
            sub: "synthetic-receiver",
          }),
        ) +
        ".fixture",
    ),
  );
  await page.getByRole("button", { name: "Retry exact saved request" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Session identity changed",
  );
  expect(requests).toHaveLength(1);
  await page
    .getByRole("button", { name: "Check renewed same-actor session" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Renewed same-actor session verified",
  );
  expect(requests).toHaveLength(1);
  expired = false;
  await page.getByRole("button", { name: "Retry exact saved request" }).click();
  await expect(page.getByRole("status")).toContainText("Server acknowledged");
  expect(requests[1]).toEqual(requests[0]);
  expect(state.posts).toHaveLength(0);
});
test("renewal never adopts another actor or auto replays", async ({ page }) => {
  const state = await setup(page, "en", "uncertain");
  await page.getByRole("button", { name: "Refresh current facts" }).click();
  await fill(page);
  await page.getByRole("button", { name: "Save receipt review" }).click();
  await page.evaluate(() =>
    localStorage.setItem(
      "accessToken",
      "new." +
        btoa(JSON.stringify({ userId: "different", sub: "different" })) +
        ".fixture",
    ),
  );
  await page
    .getByRole("button", { name: "Check renewed same-actor session" })
    .click();
  await expect(page.getByRole("status")).toContainText("Could not verify");
  expect(state.posts).toHaveLength(1);
  await expect(
    page.getByText("Saved unresolved request", { exact: true }),
  ).toBeVisible();
});
