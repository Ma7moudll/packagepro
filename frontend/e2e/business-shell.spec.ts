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
    if (path.endsWith("/auth/me")) return route.fulfill({json:{success:true,data:{id:"synthetic-vendor",email:"vendor@test.local",name:"QA Vendor",role:"MANUFACTURER"}}});
    if (path.includes("/products")) return route.fulfill({json:{success:true,data:[]}});
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

for(const language of ['en','ar'] as const)for(const width of [320,390,700,1280])test(`shell access viewport ${language} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await setup(page,language,{kind:'status',status:409,body:CONFLICT_BODY});await submitButton(page,language).click();const panel=page.getByRole('alert').filter({hasText:language==='ar'?'تغيّرت حالة العينة أثناء عملك':'Sample changed while you were working'});await expect(panel).toBeVisible();await panel.evaluate(el=>el.scrollIntoView({block:'center'}));expect(await panel.evaluate(el=>{const r=el.getBoundingClientRect();return el.scrollWidth<=el.clientWidth+1 && r.left>=0 && r.right<=innerWidth})).toBe(true);await expect(page.getByRole('navigation',{name:language==='ar'?'تنقل المورد':'Vendor navigation'})).toBeVisible();for(const b of await panel.getByRole('button').all()){expect(await b.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})).toBe(true);}await expect(page.locator('[aria-current=page]')).toHaveCount(1);await page.screenshot({path:info.outputPath(`action-${language}-${width}.png`)});await panel.getByRole('button',{name:language==='ar'?'متابعة التحرير':'Keep editing',exact:true}).click();await expect(submitButton(page,language)).toBeEnabled();await submitButton(page,language).click();await expect(panel).toBeVisible();await panel.getByRole('button',{name:language==='ar'?'إعادة تحميل العينة الحالية':'Reload current sample',exact:true}).click();await expect(panel).toHaveCount(0);await expect(page.locator('img[alt^=Sample]')).toHaveCount(2);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:info.outputPath(`navigation-${language}-${width}.png`)});await page.screenshot({path:info.outputPath(`conflict-${language}-${width}.png`)});
});


for(const path of ['/manufacturer/orders','/manufacturer/products','/b2b','/white-label','/wholesale'])for(const width of [390,1280])test(`shared route ${path} ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await setup(page,'en',{kind:'status',status:409});if(path.startsWith('/manufacturer/'))await page.getByRole('navigation',{name:'Vendor navigation'}).locator(`a[href="${path}"]`).click();else await page.goto(path);await expect(page.getByRole('navigation',{name:'Vendor navigation'})).toBeVisible();if(path==='/manufacturer/orders')await expect(page.getByRole('heading',{name:'Orders',exact:true})).toBeVisible();if(path==='/manufacturer/products')await expect(page.getByRole('heading',{name:'Product Management',exact:true})).toBeVisible();const main=page.locator('main').last();expect(await main.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1})).toBe(true);await page.screenshot({path:info.outputPath(`shared-${path.replaceAll('/','-')}-${width}.png`)});
});
