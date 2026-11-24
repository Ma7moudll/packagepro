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
  status: "quality_check",
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
    status: "completed",
    progressPercent: 100,
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

async function setup(page: Page, language: "en" | "ar", behavior: Behavior, vendorDetailFailure = false, role: "MANUFACTURER" | "ADMIN" = "MANUFACTURER",runStatus="completed",direct=false) {
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
          data: [{...poFixture(committed ? ["https://example.invalid/committed.jpg"] : []),production:{...poFixture([]).production,status:runStatus}}],
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
  if(direct){await page.goto('/manufacturer/orders/order-qa',{waitUntil:'domcontentloaded'});await expect(page.locator('[data-factory-release-note]')).toBeVisible();return counts;}
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

  return counts;
}


for(const language of ['en','ar'] as const) for(const width of [320,360,390,1280]) test(`factory completion separated from release ${language} ${width}`,async({page},info)=>{
 await page.setViewportSize({width:1280,height:1000});let writes=0;page.on('request',r=>{if(['PATCH','POST'].includes(r.method())&&/\/api\/.*(orders|production)/.test(r.url()))writes++});
 await setup(page,language,{kind:'status',status:409});await page.setViewportSize({width,height:1000});
 await expect(page.locator('[data-factory-release-note]')).toBeVisible();await expect(page.getByText(language==='ar'?'اكتمل إنتاج المصنع':'Factory Production Complete',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Mark Ready to Ship|تحديد كجاهز للشحن/})).toHaveCount(0);
 await page.locator('[data-factory-release-note]').scrollIntoViewIfNeeded();await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.locator('body').evaluate(e=>e.clientWidth));
 await page.screenshot({path:`/downloads/writer-ui-factory-${language}-${width}.png`,fullPage:false});await page.reload({waitUntil:"domcontentloaded"});await expect(page.locator('[data-factory-release-note]')).toBeVisible();await expect(page.getByText(language==='ar'?'اكتمل إنتاج المصنع':'Factory Production Complete',{exact:true})).toBeVisible();expect(writes).toBe(0);
});
for(const language of ['en','ar'] as const) for(const width of [320,360,390,1280]) test(`admin correction restriction ${language} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(l=>{localStorage.setItem('language',l);localStorage.setItem('user',JSON.stringify({id:'synthetic-admin',name:'QA',email:'admin@test.invalid',role:'ADMIN'}));localStorage.setItem('accessToken','synthetic-test-only')},language);
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let data:any={};if(path.endsWith('/cart'))data={items:[],summary:{total:0,subtotal:0,tax:0,shipping:0}};if(path.endsWith('/orders'))data=[];if(path.endsWith('/overview'))data={ordersToday:0,totalOrders:0,totalRevenue:0,revenueToday:0,unclassifiedOrderCount:0,unclassifiedTodayOrderCount:0,revenueByCurrency:[],revenueTodayByCurrency:[],ordersByStatus:[]};return route.fulfill({json:{success:true,data,pagination:{page:1,totalPages:1,total:0,limit:20}}})});
 await page.goto('/admin/orders');await expect(page.locator('[data-admin-release-note]')).toBeVisible();await page.locator('[data-admin-release-note]').scrollIntoViewIfNeeded();await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.locator('body').evaluate(e=>e.clientWidth));await page.screenshot({path:`/downloads/writer-ui-admin-${language}-${width}.png`,fullPage:false});
});
for(const language of ['en','ar'] as const) for(const width of [320,360,390]) test(`customer pending release is explicit ${language} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(l=>{localStorage.setItem('language',l);localStorage.setItem('user',JSON.stringify({id:'synthetic-customer',name:'QA',email:'customer@test.invalid',role:'TRADER'}));localStorage.setItem('accessToken','synthetic-test-only')},language);
 await page.route('**/api/**',async route=>{let data:any={};const path=new URL(route.request().url()).pathname;if(path.endsWith('/cart'))data={items:[],summary:{total:0,subtotal:0,tax:0,shipping:0}};if(path.endsWith('/orders/order-qa'))data={...orderFixture,status:'quality_check',shippingAddress:{name:'Synthetic customer',street:'Synthetic street',city:'Test city',country:'EG',phone:'Synthetic'}};return route.fulfill({json:{success:true,data}})});
 await page.goto('/orders/order-qa');await expect(page.locator('[data-order-release-note]')).toBeVisible();await page.locator('[data-order-release-note]').scrollIntoViewIfNeeded();await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.locator('body').evaluate(e=>e.clientWidth));await page.screenshot({path:`/downloads/writer-ui-customer-${language}-${width}.png`,fullPage:false});
});

test('quality review has no manual ready action',async({page})=>{await page.setViewportSize({width:1280,height:1000});await setup(page,'en',{kind:'status',status:409},false,'MANUFACTURER','quality_review');await expect(page.locator('[data-factory-release-note]')).toBeVisible();await expect(page.getByRole('button',{name:'Mark Ready to Ship',exact:true})).toHaveCount(0);});
for(const language of ['en','ar'] as const) for(const surface of ['/orders','/orders/order-qa','/manufacturer/orders','/manufacturer/orders/order-qa']) test(`legacy ready warning ${language} ${surface}`,async({page})=>{
 await page.setViewportSize({width:1280,height:1000});await page.addInitScript(l=>{localStorage.setItem('language',l);localStorage.setItem('user',JSON.stringify({id:'qa',name:'QA',email:'qa@test.invalid',role:'MANUFACTURER'}));localStorage.setItem('accessToken','synthetic-test-only')},language);
 const recorded={...orderFixture,status:'ready_to_ship',shippingAddress:{name:'Synthetic',street:'Test',city:'Test',country:'EG'}};
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let data:any={};if(path.endsWith('/cart'))data={items:[],summary:{total:0,subtotal:0,tax:0,shipping:0}};if(path.endsWith('/orders/order-qa'))data=recorded;else if(path.endsWith('/vendors/orders'))data=[{...poFixture([]),status:'ready_to_ship',order:recorded}];else if(path.endsWith('/orders'))data=[recorded];return route.fulfill({json:{success:true,data,pagination:{page:1,total:1,totalPages:1,limit:20}}})});
 for(const path of [surface]){await page.goto(path,{waitUntil:"domcontentloaded"});await expect(page.locator('[data-recorded-release-note]')).toHaveCount(1);await expect(page.locator('[data-recorded-release-note]')).toContainText(language==='ar'?'وليست تصريحًا بالشحن':'not permission to ship');await expect(page.locator('[data-recorded-release-note]').first()).toBeVisible();await page.setViewportSize({width:320,height:1000});await page.locator('[data-recorded-release-note]').first().scrollIntoViewIfNeeded();await page.screenshot({path:`/downloads/writer-legacy-${language}-${path.replaceAll('/','-')}.png`});await page.setViewportSize({width:1280,height:1000})}
});

test('cold manufacturer auth restoration never visits login',async({page})=>{let loginVisits=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/login')loginVisits++});await setup(page,'en',{kind:'status',status:409},false,'MANUFACTURER','completed',true);await expect(page).toHaveURL(/manufacturer\/orders\/order-qa$/);await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('[data-factory-release-note]')).toBeVisible();await expect(page).toHaveURL(/manufacturer\/orders\/order-qa$/);expect(loginVisits).toBe(0);});

for(const parent of ['in_production',undefined] as const) for(const language of ['en','ar'] as const) test(`manufacturer ready PO warning survives parent ${parent} ${language}`,async({page})=>{
 await page.setViewportSize({width:1280,height:1000});await page.addInitScript(l=>{localStorage.setItem('language',l);localStorage.setItem('user',JSON.stringify({id:'qa',name:'QA',email:'qa@test.invalid',role:'MANUFACTURER'}));localStorage.setItem('accessToken','synthetic-test-only')},language);
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let data:any={};if(path.endsWith('/cart'))data={items:[],summary:{total:0,subtotal:0,tax:0,shipping:0}};if(path.endsWith('/vendors/orders'))data=[{...poFixture([]),status:'ready_to_ship',order:{...orderFixture,status:parent}}];return route.fulfill({json:{success:true,data,pagination:{page:1,total:1,totalPages:1,limit:20}}})});
 await page.goto('/manufacturer/samples',{waitUntil:'domcontentloaded'});await expect(page.getByText('qa@test.invalid')).toBeVisible();await page.locator('a[href="/manufacturer/orders"]').first().click();await expect(page.locator('[data-recorded-release-note]')).toHaveCount(1);await expect(page.getByText(language==='ar'?'جاهز للشحن':'Ready to Ship',{exact:true})).toBeVisible();await page.setViewportSize({width:320,height:1000});await page.locator('[data-recorded-release-note]').scrollIntoViewIfNeeded();await page.screenshot({path:`/downloads/writer-status-mismatch-${parent}-${language}.png`});
});
