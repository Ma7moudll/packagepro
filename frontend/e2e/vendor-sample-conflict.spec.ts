import { test, expect, type Page } from "@playwright/test";

// Vendor sample-upload conflict regression — SYNTHETIC FIXTURES ONLY.
// The API is route-mocked: the samples page loads one synthetic purchase
// order whose production is in the sample stage, and POST
// /production/:id/samples is answered with controlled statuses, including
// the real backend 409 envelope for a state change during upload
// ({ success:false, error:"CONFLICT", message:"Sample changed during
// upload; reload before retrying" } — backend/src/modules/samples).
//
// Contract under test: a 409 must surface contextual EN/AR conflict
// feedback with an explicit vendor choice (reload the current sample, or
// dismiss and keep editing); the selected local photos stay selected
// until the vendor decides; nothing auto-retries or auto-re-uploads; no
// duplicate in-flight submit; no success state after a conflicted
// upload; and the pre-existing generic handling of 400/403 is preserved.

const CONFLICT_BODY = {
  success: false,
  error: "CONFLICT",
  message: "Sample changed during upload; reload before retrying",
  requestId: "synthetic-409",
};

const po = {
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
  production: {
    id: "prod-qa",
    status: "in_progress",
    progressPercent: 40,
    samples: [],
  },
};

const photo = (name: string) => ({
  name,
  mimeType: "image/jpeg",
  // Minimal JPEG header bytes — enough for the browser to hold a File of
  // an accepted type; previews use an object URL and are never decoded
  // by the assertions.
  buffer: Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]),
});

type PostBehavior =
  | { kind: "status"; status: number; body?: unknown; delayMs?: number }
  | { kind: "sequence"; steps: { status: number; body?: unknown }[] };

async function setup(
  page: Page,
  language: "en" | "ar",
  behavior: PostBehavior,
) {
  const counts = { posts: 0, orderLoads: 0 };
  await page.addInitScript((l) => {
    localStorage.setItem("language", l);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "synthetic-vendor",
        email: "vendor@test.local",
        name: "QA Vendor",
        role: "MANUFACTURER",
      }),
    );
    localStorage.setItem("accessToken", "synthetic-test-only");
  }, language);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith("/analytics/stream"))
      return route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
    if (path.endsWith("/vendors/orders")) {
      counts.orderLoads++;
      return route.fulfill({
        json: { success: true, data: [po], pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } },
      });
    }
    if (path.endsWith("/production/prod-qa/samples") && route.request().method() === "POST") {
      counts.posts++;
      const step =
        behavior.kind === "sequence"
          ? behavior.steps[Math.min(counts.posts - 1, behavior.steps.length - 1)]
          : behavior;
      if (behavior.kind === "status" && behavior.delayMs)
        await new Promise((r) => setTimeout(r, behavior.delayMs));
      const status = step.status;
      if (status >= 200 && status < 300)
        return route.fulfill({
          json: {
            success: true,
            data: { id: "sample-qa", status: "pending", photoUrls: ["https://example.invalid/sample.jpg"] },
          },
        });
      return route.fulfill({ status, json: step.body ?? { success: false, error: "ERROR", message: "Synthetic failure" } });
    }
    if (path.endsWith("/cart"))
      return route.fulfill({
        json: {
          success: true,
          data: { items: [], summary: { total: 0, subtotal: 0, tax: 0, shipping: 0 } },
        },
      });
    return route.fulfill({ json: { success: true, data: {} } });
  });
  await page.goto("/manufacturer/samples");
  await expect(page.getByText("PO-QA-1")).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles([photo("sample-a.jpg"), photo("sample-b.jpg")]);
  await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);
  return counts;
}

const submitButton = (page: Page, language: "en" | "ar") =>
  page.getByRole("button", { name: language === "ar" ? "إرسال للمراجعة" : "Submit for QA review" });

test("409 conflict: contextual panel, photos retained, no success, no auto-retry (en)", async ({ page }, info) => {
  const counts = await setup(page, "en", { kind: "status", status: 409, body: CONFLICT_BODY });
  await submitButton(page, "en").click();

  const panel = page.getByRole("alert").filter({ hasText: "Sample changed while you were working" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("could not be accepted");
  // The vendor's selected photos are still selected.
  await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);
  // No success state after a conflicted upload.
  await expect(page.getByText("Sample submitted", { exact: true }).first()).toHaveCount(0);
  // The vendor must choose explicitly — submit is unavailable meanwhile.
  await expect(submitButton(page, "en")).toBeDisabled();
  // No automatic retry / re-upload.
  await page.waitForTimeout(1500);
  expect(counts.posts).toBe(1);

  await page.screenshot({ path: info.outputPath("synthetic-conflict-en.png"), fullPage: true });
});

test("409 conflict: reload is the vendor's explicit choice, then a manual resubmit can succeed (en)", async ({ page }) => {
  const counts = await setup(page, "en", {
    kind: "sequence",
    steps: [
      { status: 409, body: CONFLICT_BODY },
      { status: 200 },
    ],
  });
  await submitButton(page, "en").click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sample changed while you were working" }),
  ).toBeVisible();

  const loadsBefore = counts.orderLoads;
  await page.getByRole("button", { name: "Reload current sample" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sample changed while you were working" }),
  ).toHaveCount(0);
  expect(counts.orderLoads).toBeGreaterThan(loadsBefore);
  // Reloading did not discard the vendor's photos or re-upload by itself.
  await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);
  expect(counts.posts).toBe(1);
  await expect(submitButton(page, "en")).toBeEnabled();

  // A deliberate manual resubmit now succeeds through the normal path.
  await submitButton(page, "en").click();
  await expect(page.getByText("Sample submitted", { exact: true }).first()).toBeVisible();
  await expect(page.locator('img[alt^="Sample"]')).toHaveCount(0);
  expect(counts.posts).toBe(2);
});

test("409 conflict: dismiss keeps the vendor editing with photos intact (en)", async ({ page }) => {
  const counts = await setup(page, "en", { kind: "status", status: 409, body: CONFLICT_BODY });
  await submitButton(page, "en").click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sample changed while you were working" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sample changed while you were working" }),
  ).toHaveCount(0);
  await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);
  await expect(submitButton(page, "en")).toBeEnabled();
  expect(counts.posts).toBe(1);
});

test("409 conflict: Arabic contextual panel, photos retained (ar)", async ({ page }, info) => {
  const counts = await setup(page, "ar", { kind: "status", status: 409, body: CONFLICT_BODY });
  await submitButton(page, "ar").click();

  const panel = page.getByRole("alert").filter({ hasText: "تغيّرت حالة العينة أثناء عملك" });
  await expect(panel).toBeVisible();
  await expect(page.getByRole("button", { name: "إعادة تحميل العينة الحالية" })).toBeVisible();
  await expect(page.getByRole("button", { name: "متابعة التحرير" })).toBeVisible();
  await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);
  await expect(page.getByText("تم رفع العينة", { exact: true })).toHaveCount(0);
  expect(counts.posts).toBe(1);

  await page.screenshot({ path: info.outputPath("synthetic-conflict-ar.png"), fullPage: true });
});

for (const status of [400, 403])
  test(`${status} handling preserved: generic failure toast, no conflict panel (en)`, async ({ page }) => {
    const counts = await setup(page, "en", {
      kind: "status",
      status,
      body: { success: false, error: status === 400 ? "VALIDATION_ERROR" : "AUTHORIZATION_ERROR", message: "Synthetic failure" },
    });
    await submitButton(page, "en").click();
    await expect(page.getByText("Upload failed", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: "Sample changed while you were working" }),
    ).toHaveCount(0);
    expect(counts.posts).toBe(1);
  });

test("no duplicate in-flight submit (en)", async ({ page }) => {
  const counts = await setup(page, "en", { kind: "status", status: 200, delayMs: 1200 });
  const button = submitButton(page, "en");
  await button.click();
  await expect(button).toBeDisabled();
  // A second activation attempt while the upload is in flight is a no-op.
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Uploading"),
    ) as HTMLButtonElement | undefined;
    btn?.click();
  });
  await expect(page.getByText("Sample submitted", { exact: true }).first()).toBeVisible();
  expect(counts.posts).toBe(1);
});

for (const status of [400,403,500]) test(`failed ${status} retains local photos`,async({page})=>{
 const c=await setup(page,'en',{kind:'status',status});await submitButton(page,'en').click();await expect(page.getByText('Upload failed',{exact:true}).first()).toBeVisible();await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);expect(c.posts).toBe(1);
});
test('failed conflict reload keeps conflict and photos',async({page})=>{
 await setup(page,'en',{kind:'status',status:409,body:CONFLICT_BODY});await submitButton(page,'en').click();await expect(page.getByText('Sample changed while you were working',{exact:true})).toBeVisible();await page.route('**/vendors/orders?**',r=>r.fulfill({status:500,json:{success:false,error:'synthetic reload failure'}}));await page.getByRole('button',{name:'Reload current sample'}).click();await expect(page.getByText('Sample changed while you were working',{exact:true})).toBeVisible();await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);await expect(submitButton(page,'en')).toBeDisabled();
});
test('closed production reload retains photos and prevents submit',async({page},info)=>{
 const c=await setup(page,'en',{kind:'status',status:409,body:CONFLICT_BODY});await submitButton(page,'en').click();await expect(page.getByText('Sample changed while you were working',{exact:true})).toBeVisible();await page.route('**/vendors/orders?**',r=>r.fulfill({json:{success:true,data:[{...po,production:{...po.production,status:'quality_review'}}]}}));await page.getByRole('button',{name:'Reload current sample'}).click();await expect(page.getByText('Production: quality_review',{exact:false})).toBeVisible();await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);await expect(submitButton(page,'en')).toBeDisabled();await expect(page.locator('input[type=file]')).toHaveCount(0);await expect(page.getByRole('status').filter({hasText:'Submission is unavailable in the current state.'})).toBeVisible();expect(c.posts).toBe(1);await page.screenshot({path:info.outputPath('closed-retained-desktop.png'),fullPage:true});
});

test('success false upload retains photos',async({page})=>{
 const c=await setup(page,'en',{kind:'status',status:409});await page.route('**/production/prod-qa/samples',r=>r.fulfill({json:{success:false,error:'Synthetic failure'}}));await submitButton(page,'en').click();await expect(page.getByText('Upload failed',{exact:true}).first()).toBeVisible();await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);await expect(page.getByText('Sample submitted',{exact:true})).toHaveCount(0);
});
test('overlapping conflict reload and Refresh keeps latest server state and local photos',async({page})=>{
 await setup(page,'en',{kind:'status',status:409,body:CONFLICT_BODY});await submitButton(page,'en').click();await expect(page.getByText('Sample changed while you were working',{exact:true})).toBeVisible();let release!:()=>void;const held=new Promise<void>(r=>release=r);let loads=0;await page.route('**/vendors/orders?**',async r=>{loads++;if(loads===1){await held;return r.fulfill({json:{success:true,data:[po]}})}return r.fulfill({json:{success:true,data:[{...po,production:{...po.production,status:'quality_review'}}]}})});
 await page.getByRole('button',{name:'Reload current sample'}).click();await expect.poll(()=>loads).toBe(1);await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByText('Production: quality_review',{exact:false})).toBeVisible();release();await expect(page.getByText('Could not refresh the current state. Your selected photos are still here. Reload current sample again.')).toBeVisible();await expect(page.getByText('Production: quality_review',{exact:false})).toBeVisible();await expect(page.locator('img[alt^="Sample"]')).toHaveCount(2);await expect(submitButton(page,'en')).toBeDisabled();
});
for(const language of ['en','ar'] as const)for(const width of [320,390])test(`conflict mobile ${language} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await setup(page,language,{kind:'status',status:409,body:CONFLICT_BODY});await submitButton(page,language).click();const panel=page.getByRole('alert').filter({hasText:language==='ar'?'تغيّرت حالة العينة أثناء عملك':'Sample changed while you were working'});await expect(panel).toBeVisible();await panel.evaluate(el=>el.scrollIntoView({block:'center'}));expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`conflict-${language}-${width}.png`)});await panel.screenshot({path:info.outputPath(`conflict-panel-${language}-${width}.png`)});
});

test('postcommit refresh failure is not upload failure',async({page})=>{
 await setup(page,'en',{kind:'status',status:200});await page.route('**/vendors/orders?**',r=>r.fulfill({status:500,json:{success:false,error:'synthetic refresh failure'}}));await submitButton(page,'en').click();await expect(page.getByText('Sample submitted',{exact:true}).first()).toBeVisible();await expect(page.getByText('Samples could not refresh. The displayed state may be stale. Try again.',{exact:true})).toBeVisible();await expect(page.getByText('Upload failed',{exact:true})).toHaveCount(0);await expect(page.locator('img[alt^="Sample"]')).toHaveCount(0);
});
test('closed production without selections has no upload controls',async({page})=>{
 await setup(page,'en',{kind:'status',status:409});await page.getByRole('button',{name:'Remove photo 1'}).count();await page.route('**/vendors/orders?**',r=>r.fulfill({json:{success:true,data:[{...po,id:'new-po',production:{...po.production,id:'new-prod',status:'completed'}}]}}));await page.getByRole('button',{name:'Refresh',exact:true}).click();await expect(page.getByText('Production: completed',{exact:false})).toBeVisible();await expect(page.locator('input[type=file]')).toHaveCount(0);await expect(submitButton(page,'en')).toHaveCount(0);
});
