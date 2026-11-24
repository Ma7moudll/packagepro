import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Admin list race + failure-surfacing regression (synthetic fixtures only).
 *
 * The orders/customers/vendors list loads used to commit rows, pagination
 * and the loading flag unconditionally, with no request ownership: a slow
 * older response could overwrite a newer one, and a failed fetch was only
 * console.error'd — stale rows stayed on screen with no error, or a first
 * load failure rendered as the ordinary "empty" message.
 *
 * These tests drive the REAL pages with controlled inverted response
 * timing via route interception and assert on rendered rows, pagination
 * text and the error alert — they fail on the unguarded code and pass
 * once only the latest request may commit.
 */

const orderRow = (id: string, orderNumber: string) => ({
  id,
  orderNumber,
  status: "completed",
  currency: "EGP",
  total: 100,
  items: [],
  createdAt: new Date().toISOString(),
});

const customerRow = (id: string, firstName: string, email: string) => ({
  id,
  email,
  firstName,
  lastName: "Synthetic",
  ordersCount: 1,
  lifetimeValue: 0,
  lifetimeValueByCurrency: [],
  unclassifiedOrderCount: 0,
  memberSince: new Date().toISOString(),
});

const vendorRow = (id: string, companyName: string) => ({
  id,
  companyName,
  city: "Cairo",
  country: "EG",
  isActive: true,
  qualityRating: 5,
  user: { email: "vendor@test.local" },
  _count: { purchaseOrders: 0, handshakes: 0, productions: 0, reviews: 0 },
});

const page1of1 = { page: 1, limit: 20, total: 1, totalPages: 1 };
const page1of3 = { page: 1, limit: 20, total: 60, totalPages: 3 };

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

async function setupAdmin(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("language", "en");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "synthetic-admin",
        email: "admin@test.local",
        name: "QA",
        role: "ADMIN",
      }),
    );
    localStorage.setItem("accessToken", "synthetic-test-only");
  });
}

/** Fulfil every non-list API call the layout/pages make. */
async function fulfillOther(route: Route) {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith("/analytics/stream"))
    return route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
  if (path.endsWith("/cart"))
    return route.fulfill({
      json: {
        success: true,
        data: { items: [], summary: { total: 0, subtotal: 0, tax: 0, shipping: 0 } },
      },
    });
  if (path.endsWith("/admin/overview"))
    return route.fulfill({
      json: {
        success: true,
        data: {
          ordersToday: 0,
          totalOrders: 0,
          totalRevenue: 0,
          revenueToday: 0,
          revenueByCurrency: [],
          revenueTodayByCurrency: [],
          activeVendors: 0,
          totalCustomers: 0,
          pendingHandshakes: 0,
          pendingSettlements: 0,
          ordersByStatus: [],
        },
      },
    });
  return route.fulfill({ json: { success: true, data: {} } });
}

test("orders: a slow stale response cannot overwrite a newer search result", async ({ page }) => {
  await setupAdmin(page);
  const gate = deferred();
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/admin/orders")) {
      if (url.searchParams.get("search") === "zzz")
        return route.fulfill({
          json: { success: true, data: [orderRow("new", "SECOND-RESULT")], pagination: page1of1 },
        });
      // The initial (unfiltered) load is held back so it resolves LAST.
      await gate.promise;
      return route.fulfill({
        json: { success: true, data: [orderRow("stale", "FIRST-STALE")], pagination: page1of3 },
      });
    }
    return fulfillOther(route);
  });

  await page.goto("/admin/orders");
  await page.getByPlaceholder(/Search by order number/).fill("zzz");
  await expect(page.getByText("SECOND-RESULT")).toBeVisible();

  gate.resolve();
  await page.waitForTimeout(750);

  await expect(page.getByText("FIRST-STALE")).toHaveCount(0);
  await expect(page.getByText("SECOND-RESULT")).toBeVisible();
  await expect(page.getByText("Page 1 of 3")).toHaveCount(0);
});

test("orders: an older response resolving during a newer load commits nothing and keeps the loading state", async ({ page }) => {
  await setupAdmin(page);
  const gate = deferred();
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/admin/orders")) {
      if (url.searchParams.get("search") === "zzz") {
        // The newer request stays in flight until the test releases it.
        await gate.promise;
        return route.fulfill({
          json: { success: true, data: [orderRow("new", "SECOND-RESULT")], pagination: page1of1 },
        });
      }
      // The older request resolves while the newer one is in flight.
      await new Promise((r) => setTimeout(r, 900));
      return route.fulfill({
        json: { success: true, data: [orderRow("stale", "EARLY-STALE")], pagination: page1of3 },
      });
    }
    return fulfillOther(route);
  });

  await page.goto("/admin/orders");
  await page.getByPlaceholder(/Search by order number/).fill("zzz");
  // Debounce (350ms) + the older request's 900ms delay have both elapsed;
  // the newer request is still held.
  await page.waitForTimeout(1400);

  await expect(page.getByText("EARLY-STALE")).toHaveCount(0);
  await expect(page.getByText("Page 1 of 3")).toHaveCount(0);

  gate.resolve();
  await expect(page.getByText("SECOND-RESULT")).toBeVisible();
});

test("orders: a failed reload surfaces an error and drops the stale rows", async ({ page }) => {
  await setupAdmin(page);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/admin/orders")) {
      if (url.searchParams.get("search") === "boom")
        return route.fulfill({ status: 500, json: { success: false, error: "synthetic failure" } });
      return route.fulfill({
        json: { success: true, data: [orderRow("ok", "GOOD-ROW")], pagination: page1of1 },
      });
    }
    return fulfillOther(route);
  });

  await page.goto("/admin/orders");
  await expect(page.getByText("GOOD-ROW")).toBeVisible();

  await page.getByPlaceholder(/Search by order number/).fill("boom");
  await expect(page.getByText(/Failed to load orders/)).toBeVisible();
  await expect(page.getByText("GOOD-ROW")).toHaveCount(0);
});

test("customers: a slow stale response cannot overwrite a newer search result", async ({ page }) => {
  await setupAdmin(page);
  const gate = deferred();
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/admin/customers")) {
      if (url.searchParams.get("search") === "zzz")
        return route.fulfill({
          json: {
            success: true,
            data: [customerRow("new", "Second", "second@test.local")],
            pagination: page1of1,
          },
        });
      await gate.promise;
      return route.fulfill({
        json: {
          success: true,
          data: [customerRow("stale", "First", "first@test.local")],
          pagination: page1of3,
        },
      });
    }
    return fulfillOther(route);
  });

  await page.goto("/admin/customers");
  await page.getByPlaceholder(/Search by name or email/).fill("zzz");
  await expect(page.getByText("second@test.local")).toBeVisible();

  gate.resolve();
  await page.waitForTimeout(750);

  await expect(page.getByText("first@test.local")).toHaveCount(0);
  await expect(page.getByText("second@test.local")).toBeVisible();
  await expect(page.getByText("Page 1 of 3")).toHaveCount(0);
});

test("customers: a failed reload surfaces an error and drops the stale rows", async ({ page }) => {
  await setupAdmin(page);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/admin/customers")) {
      if (url.searchParams.get("search") === "boom")
        return route.fulfill({ status: 500, json: { success: false, error: "synthetic failure" } });
      return route.fulfill({
        json: {
          success: true,
          data: [customerRow("ok", "Good", "good@test.local")],
          pagination: page1of1,
        },
      });
    }
    return fulfillOther(route);
  });

  await page.goto("/admin/customers");
  await expect(page.getByText("good@test.local")).toBeVisible();

  await page.getByPlaceholder(/Search by name or email/).fill("boom");
  await expect(page.getByText(/Failed to load customers/)).toBeVisible();
  await expect(page.getByText("good@test.local")).toHaveCount(0);
});

test("vendors: overlapping mount loads — the older response must not win", async ({ page }) => {
  await setupAdmin(page);
  const gate = deferred();
  let count = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/admin/vendors")) {
      count++;
      if (count === 1) {
        // The first mount load is held so it resolves LAST.
        await gate.promise;
        return route.fulfill({
          json: { success: true, data: [vendorRow("v1", "FIRST VENDOR")], pagination: page1of1 },
        });
      }
      return route.fulfill({
        json: { success: true, data: [vendorRow("v2", "SECOND VENDOR")], pagination: page1of1 },
      });
    }
    return fulfillOther(route);
  });

  await page.goto("/admin/vendors");
  await page.waitForTimeout(1500);
  test.skip(
    count < 2,
    `only ${count} vendors list request(s) fired on mount — no overlapping loads to race`,
  );

  await expect(page.getByText("SECOND VENDOR")).toBeVisible();
  gate.resolve();
  await page.waitForTimeout(750);

  await expect(page.getByText("FIRST VENDOR")).toHaveCount(0);
  await expect(page.getByText("SECOND VENDOR")).toBeVisible();
});

test("vendors: a failed initial load surfaces an error instead of an empty list", async ({ page }) => {
  await setupAdmin(page);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/admin/vendors"))
      return route.fulfill({ status: 500, json: { success: false, error: "synthetic failure" } });
    return fulfillOther(route);
  });

  await page.goto("/admin/vendors");
  await expect(page.getByText(/Failed to load vendors/)).toBeVisible();
});

for(const target of ['orders','customers'] as const)test(`${target}: stale page2 cannot replace new filter page1`,async({page})=>{
 await setupAdmin(page);const gate=deferred();let page2=false;await page.route('**/api/**',async route=>{const u=new URL(route.request().url());if(!u.pathname.endsWith('/admin/'+target))return fulfillOther(route);const row=(name:string)=>target==='orders'?orderRow(name,name):customerRow(name,name,name+'@test.invalid');if(u.searchParams.get('page')==='2'){page2=true;await gate.promise;return route.fulfill({json:{success:true,data:[row('STALE-PAGE2')],pagination:{...page1of3,page:2}}})}const filtered=target==='orders'?u.searchParams.get('status')==='in_production':u.searchParams.get('search')==='new';return route.fulfill({json:{success:true,data:[row(filtered?'FILTERED-PAGE1':'INITIAL-PAGE1')],pagination:filtered?page1of1:page1of3}})});
 await page.goto('/admin/'+target);await expect(page.getByText('INITIAL-PAGE1',{exact:false}).first()).toBeVisible();await page.locator('button').filter({has:page.locator('svg.lucide-chevron-right')}).click();await expect.poll(()=>page2).toBe(true);if(target==='orders'){await page.getByRole('combobox').click();await page.getByRole('option',{name:'in production',exact:true}).click()}else await page.getByPlaceholder(/Search/).fill('new');await expect(page.getByText('FILTERED-PAGE1',{exact:false}).first()).toBeVisible();gate.resolve();await page.waitForTimeout(250);await expect(page.getByText('STALE-PAGE2',{exact:false})).toHaveCount(0);await expect(page.getByText('Page 2 of 3')).toHaveCount(0);
});

test('orders: new reload clears previous error while request remains pending',async({page})=>{
 await setupAdmin(page);const gate=deferred();let requests=0;await page.route('**/api/**',async route=>{if(!new URL(route.request().url()).pathname.endsWith('/admin/orders'))return fulfillOther(route);if(++requests===1)return route.fulfill({status:500,json:{success:false,error:'synthetic'}});await gate.promise;return route.fulfill({json:{success:true,data:[orderRow('ok','RECOVERED')],pagination:page1of1}})});await page.goto('/admin/orders');await expect(page.getByText('Failed to load orders. Please try again.')).toBeVisible();await page.getByPlaceholder(/Search by order number/).fill('new');await expect.poll(()=>requests).toBe(2);await expect(page.getByText('Failed to load orders. Please try again.')).toHaveCount(0);gate.resolve();await expect(page.getByText('RECOVERED')).toBeVisible();
});
