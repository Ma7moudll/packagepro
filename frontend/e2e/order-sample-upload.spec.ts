import { test, expect, type Page } from "@playwright/test";

// Manufacturer ORDER-DETAIL single-photo upload regression — SYNTHETIC
// FIXTURES ONLY. The API is route-mocked: the order-detail page loads one
// synthetic order + purchase order whose production is in progress, and
// POST /production/:id/samples is answered with controlled statuses,
// including the real backend 409 envelope for a state change during
// upload ({ success:false, error:"CONFLICT", message:"Sample changed
// during upload; reload before retrying" }).
//
// Contract under test: an upload failure on this page must be explicit
// (EN/AR feedback; conflict-specific wording for a 409), the selected
// file stays retained — visibly marked as not uploaded — until the
// person explicitly retries, reloads, or removes it; nothing
// auto-retries; no duplicate in-flight submit; and a failed upload never
// appears among the committed (server) sample photos.

const CONFLICT_BODY = {
  success: false,
  error: "CONFLICT",
  message: "Sample changed during upload; reload before retrying",
  requestId: "synthetic-409",
};

const orderFixture = {
  id: "order-qa",
  orderNumber: "ORD-QA-1",
  status: "in_production",
  subtotal: 100,
  tax: 14,
  shippingCost: 0,
  total: 114,
  currency: "EGP",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [],
  shippingAddress: null,
};

const poFixture = (photoUrls: string[]) => ({
  id: "po-qa",
  orderId: "order-qa",
  poNumber: "PO-QA-1",
  vendorId: "vendor-qa",
  status: "confirmed",
  vendorCost: 100,
  currency: "EGP",
  requestedDeliveryDate: null,
  confirmedAt: null,
  createdAt: new Date().toISOString(),
  handshake: { id: "hs-qa", status: "accepted", expiresAt: "", acceptedAt: null, rejectedAt: null, rejectionReason: null },
  production: {
    id: "prod-qa",
    status: "in_progress",
    progressPercent: 40,
    samples: [{ id: "sample-qa", status: "pending", photoUrls, updatedAt: new Date().toISOString() }],
  },
});

const photoFile = (name: string) => ({
  name,
  mimeType: "image/jpeg",
  buffer: Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]),
});

type Behavior = { kind: "status"; status: number; body?: unknown; delayMs?: number }
  | { kind: "sequence"; steps: { status: number; body?: unknown }[] };

async function setup(page: Page, language: "en" | "ar", behavior: Behavior, vendorDetailFailure = false, role: "MANUFACTURER" | "ADMIN" = "MANUFACTURER") {
  const counts = { posts: 0, vendorOrderLoads: 0 };
  let committed = false;
  let detailLoaded = false;
  await page.addInitScript(({l,role}) => {
    localStorage.setItem("language", l);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "synthetic-vendor",
        email: "vendor@test.local",
        name: "QA Vendor",
        role,
      }),
    );
    localStorage.setItem("accessToken", "synthetic-test-only");
  }, {l:language,role});
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({json:{success:true,data:{id:"synthetic-vendor",email:"vendor@test.local",name:"QA Vendor",role:"MANUFACTURER"}}});
    if (path.endsWith("/analytics/stream"))
      return route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
    if (path.endsWith("/vendors/orders")) {
      counts.vendorOrderLoads++;
      if (vendorDetailFailure && detailLoaded) return route.fulfill({status:500,json:{success:false,error:"ERROR"}});
      return route.fulfill({
        json: {
          success: true,
          data: [poFixture(committed ? ["https://example.invalid/committed.jpg"] : [])],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      });
    }
    if (path.endsWith("/orders/order-qa")) { detailLoaded = true; return route.fulfill({ json: { success: true, data: orderFixture } }); }
    if (path.endsWith("/production/prod-qa/samples") && route.request().method() === "POST") {
      counts.posts++;
      const step =
        behavior.kind === "sequence"
          ? behavior.steps[Math.min(counts.posts - 1, behavior.steps.length - 1)]
          : behavior;
      if (behavior.kind === "status" && behavior.delayMs)
        await new Promise((r) => setTimeout(r, behavior.delayMs));
      if (step.status >= 200 && step.status < 300) {
        committed = true;
        return route.fulfill({
          json: { success: true, data: { id: "sample-qa", status: "pending", photoUrls: ["https://example.invalid/committed.jpg"] } },
        });
      }
      return route.fulfill({
        status: step.status,
        json: step.body ?? { success: false, error: "ERROR", message: "Synthetic failure" },
      });
    }
    if (path.endsWith("/cart"))
      return route.fulfill({
        json: { success: true, data: { items: [], summary: { total: 0, subtotal: 0, tax: 0, shipping: 0 } } },
      });
    return route.fulfill({ json: { success: true, data: {} } });
  });
  // Fixture note (not product behavior under test): this page's mount
  // effect pushes /login whenever it runs before the auth provider has
  // restored the stored session — a pre-existing mount race in the
  // page's auth guard (unlike the samples page, it does not wait for
  // the provider's loading flag). A hard load therefore bounces to
  // /login a second or two later, mid-test. To isolate the upload
  // path, the test enters through the samples page (whose guard waits)
  // and then navigates client-side via the real sidebar + list links,
  // with the provider already holding the valid stored session.
  await page.goto("/manufacturer/samples");
  // The sidebar prints the account email only once the provider holds
  // the session — that is also the signal the app has hydrated, so the
  // sidebar click below is a client-side navigation, not a reload.
  await expect(page.getByText("vendor@test.local")).toBeVisible();
  await page.locator('a[href="/manufacturer/orders"]').first().click();
  await expect(page.locator('a[href="/manufacturer/orders/order-qa"]')).toBeVisible();
  await page.locator('a[href="/manufacturer/orders/order-qa"]').click();
  if (vendorDetailFailure) { await expect(page.getByRole("heading",{name:"Order Details",exact:true})).toBeVisible(); return counts; }
  await expect(page.getByText(/Production Progress|تقدم الإنتاج/)).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(1);
  return counts;
}

async function selectPhoto(page: Page, name = "sample-a.jpg") {
  await page.locator('input[type="file"]').setInputFiles([photoFile(name)]);
}

const committedPhotos = (page: Page) => page.locator('img[alt^="Sample photo"]');
const retainedRow = (page: Page, name = "sample-a.jpg") =>
  page.locator("[data-pending-photo]", { hasText: name });

test("409: explicit conflict feedback, file retained and not presented as uploaded (en)", async ({ page }, info) => {
  const counts = await setup(page, "en", { kind: "status", status: 409, body: CONFLICT_BODY });
  await selectPhoto(page);

  const alert = page.getByRole("alert").filter({ hasText: "Sample changed while you were working" });
  await expect(alert).toBeVisible();
  // The selected file is still here, marked as not uploaded.
  await expect(retainedRow(page)).toBeVisible();
  await expect(retainedRow(page)).toContainText("Not uploaded yet");
  // Nothing was committed: no server photo appears.
  await expect(committedPhotos(page)).toHaveCount(0);
  await expect(page.getByText("No sample photos uploaded yet")).toBeVisible();
  // No automatic retry.
  await page.waitForTimeout(1200);
  expect(counts.posts).toBe(1);

  await page.screenshot({ path: info.outputPath("synthetic-order-upload-conflict-en.png"), fullPage: true });
});

test("409: reload is explicit and keeps the file; a manual re-upload then commits (en)", async ({ page }) => {
  const counts = await setup(page, "en", {
    kind: "sequence",
    steps: [{ status: 409, body: CONFLICT_BODY }, { status: 200 }],
  });
  await selectPhoto(page);
  await expect(
    page.getByRole("alert").filter({ hasText: "Sample changed while you were working" }),
  ).toBeVisible();

  const loadsBefore = counts.vendorOrderLoads;
  await page.getByRole("button", { name: "Reload order" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sample changed while you were working" }),
  ).toHaveCount(0);
  expect(counts.vendorOrderLoads).toBeGreaterThan(loadsBefore);
  // Reloading did not discard the retained file or re-upload by itself.
  await expect(retainedRow(page)).toBeVisible();
  expect(counts.posts).toBe(1);

  await page.getByRole("button", { name: "Upload this photo" }).click();
  await expect(committedPhotos(page)).toHaveCount(1);
  await expect(retainedRow(page)).toHaveCount(0);
  expect(counts.posts).toBe(2);
});

test("500: generic failure feedback, file retained; explicit remove discards it; the same file can be picked again (en)", async ({ page }) => {
  const counts = await setup(page, "en", {
    kind: "sequence",
    steps: [{ status: 500 }, { status: 200 }],
  });
  await selectPhoto(page);

  const alert = page.getByRole("alert").filter({ hasText: "Upload failed" });
  await expect(alert).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sample changed while you were working" }),
  ).toHaveCount(0);
  await expect(retainedRow(page)).toBeVisible();
  await expect(committedPhotos(page)).toHaveCount(0);
  expect(counts.posts).toBe(1);

  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(retainedRow(page)).toHaveCount(0);
  await expect(alert).toHaveCount(0);

  // Re-selecting the very same file must fire a fresh upload attempt.
  await selectPhoto(page);
  await expect(committedPhotos(page)).toHaveCount(1);
  expect(counts.posts).toBe(2);
});

test("400: generic failure feedback, not conflict wording (en)", async ({ page }) => {
  await setup(page, "en", {
    kind: "status",
    status: 400,
    body: { success: false, error: "VALIDATION_ERROR", message: "Synthetic validation failure" },
  });
  await selectPhoto(page);
  await expect(page.getByRole("alert").filter({ hasText: "Upload failed" })).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sample changed while you were working" }),
  ).toHaveCount(0);
  await expect(retainedRow(page)).toBeVisible();
});

test("409: Arabic conflict feedback, file retained (ar)", async ({ page }, info) => {
  const counts = await setup(page, "ar", { kind: "status", status: 409, body: CONFLICT_BODY });
  await selectPhoto(page);

  const alert = page.getByRole("alert").filter({ hasText: "تغيّرت حالة العينة أثناء عملك" });
  await expect(alert).toBeVisible();
  await expect(page.getByRole("button", { name: "تحديث بيانات الطلب" })).toBeVisible();
  await expect(retainedRow(page)).toBeVisible();
  await expect(retainedRow(page)).toContainText("لم تُرفع بعد");
  await expect(committedPhotos(page)).toHaveCount(0);
  expect(counts.posts).toBe(1);

  await page.screenshot({ path: info.outputPath("synthetic-order-upload-conflict-ar.png"), fullPage: true });
});

test("no duplicate in-flight submit; success commits through server data (en)", async ({ page }) => {
  const counts = await setup(page, "en", { kind: "status", status: 200, delayMs: 1200 });
  await selectPhoto(page);
  // While the upload is in flight the file input is disabled; a second
  // programmatic activation cannot start another upload.
  await expect(page.locator('input[type="file"]')).toBeDisabled();
  await page.evaluate(() => {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    input?.click();
  });
  await expect(committedPhotos(page)).toHaveCount(1);
  await expect(retainedRow(page)).toHaveCount(0);
  expect(counts.posts).toBe(1);
});


test("failed reload preserves retained photo and conflict",async({page})=>{
 await setup(page,"en",{kind:"status",status:409});await selectPhoto(page);
 await expect(page.getByRole("alert")).toBeVisible();
 await page.route("**/orders/order-qa",r=>r.fulfill({status:500,json:{success:false,error:"ERROR"}}));
 await page.getByRole("button",{name:"Reload order"}).click();
 await expect(retainedRow(page)).toBeVisible();
 await expect(page.getByRole("alert").filter({hasText:"Sample changed while you were working"})).toBeVisible();
});

test("closed stage after reload retains file but forbids retry",async({page})=>{
 const counts=await setup(page,"en",{kind:"status",status:409});await selectPhoto(page);
 await expect(page.getByRole("button",{name:"Reload order"})).toBeVisible();
 await page.route("**/vendors/orders**",r=>{const po=poFixture([]);po.production.status="quality_review";return r.fulfill({json:{success:true,data:[po]}})});
 await page.getByRole("button",{name:"Reload order"}).click();
 await expect(retainedRow(page)).toBeVisible();
 await expect(page.getByRole("button",{name:"Upload this photo"})).toBeDisabled();
 expect(counts.posts).toBe(1);
});

test("success false response retains photo with generic error",async({page})=>{
 await setup(page,"en",{kind:"status",status:200});
 await page.route("**/production/prod-qa/samples",r=>r.fulfill({json:{success:false,error:"ERROR"}}));
 await selectPhoto(page);await expect(page.getByRole("alert").filter({hasText:"Upload failed"})).toBeVisible();await expect(retainedRow(page)).toBeVisible();
});

test("committed upload with failed refresh states stale data not failed upload",async({page})=>{
 await setup(page,"en",{kind:"status",status:200});
 await page.route("**/orders/order-qa",r=>r.fulfill({status:500,json:{success:false,error:"ERROR"}}));
 await selectPhoto(page);await expect(page.getByText("Photo uploaded, but order data could not be refreshed.",{exact:true})).toBeVisible();await expect(retainedRow(page)).toHaveCount(0);
});


test("conflict holds file input and explicit remove remains available",async({page})=>{
 const counts=await setup(page,"en",{kind:"status",status:409});await selectPhoto(page);
 await expect(page.getByRole("button",{name:"Reload order"})).toBeVisible();await expect(page.locator('input[type="file"]')).toBeDisabled();
 await page.locator('input[type="file"]').evaluate(el=>el.dispatchEvent(new Event("change",{bubbles:true})));
 expect(counts.posts).toBe(1);await page.getByRole("button",{name:"Remove photo"}).click();await expect(retainedRow(page)).toHaveCount(0);
});

test("missing PO after reload preserves file with upload unavailable",async({page})=>{
 const counts=await setup(page,"en",{kind:"status",status:409});await selectPhoto(page);await expect(page.getByRole("button",{name:"Reload order"})).toBeVisible();
 await page.route("**/vendors/orders**",r=>r.fulfill({json:{success:true,data:[]}}));await page.getByRole("button",{name:"Reload order"}).click();await expect(retainedRow(page)).toBeVisible();await expect(page.getByRole("button",{name:"Upload this photo"})).toBeDisabled();await expect(page.locator('input[type="file"]')).toHaveCount(0);await expect(page.getByText("Production data unavailable",{exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Start Production",exact:true})).toHaveCount(0);expect(counts.posts).toBe(1);
});


test("initial detail vendor-list failure still renders order",async({page})=>{
 await setup(page,"en",{kind:"status",status:409},true);await expect(page.getByText("ORD-QA-1",{exact:false}).first()).toBeVisible();await expect(page.getByRole("heading",{name:"Order Details",exact:true})).toBeVisible();
});


test("ADMIN initial detail vendor-list failure still renders order",async({page})=>{
 await setup(page,"en",{kind:"status",status:409},true,"ADMIN");await expect(page.getByRole("heading",{name:"Order Details",exact:true})).toBeVisible();
});
