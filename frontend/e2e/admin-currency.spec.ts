import { test, expect, type Page } from "@playwright/test";
const groups = [
  { currency: "EGP", amount: 100 },
  { currency: "USD", amount: 10 },
];
const order = (id: string, currency: string | null, total: number) => ({
  id,
  orderNumber: id,
  status: "completed",
  currency,
  total,
  items: [],
  createdAt: new Date().toISOString(),
});
const overview = {
  ordersToday: 4,
  totalOrders: 4,
  totalRevenue: 125,
  revenueToday: 125,
  unclassifiedOrderCount:2,
  unclassifiedTodayOrderCount:2,
  revenueByCurrency: groups,
  revenueTodayByCurrency: groups,
  activeVendors: 0,
  totalCustomers: 1,
  pendingHandshakes: 0,
  pendingSettlements: 2,
  ordersByStatus: [],
};
const report = {
  period: { start: "2026-11-01", end: "2026-11-23" },
  revenue: 110,
  profit: -250,
  costs: 360,
  vendorPayments: 360,
  taxes: 15,
  orderCount: 4,
  averageOrderValue: 27.5,
  unclassifiedOrderCount: 2,
  byCurrency: [
    {
      currency: "EGP",
      revenue: 100,
      taxes: 14,
      orderCount: 1,
      averageOrderValue: 100,
      vendorPayments: 60,
      costs: 60,
      profit: 40,
      costStatus: "same-currency",
    },
    {
      currency: "USD",
      revenue: 10,
      taxes: 1,
      orderCount: 1,
      averageOrderValue: 10,
      vendorPayments: null,
      costs: null,
      profit: null,
      costStatus: "unreconciled",
    },
  ],
};
for (const language of ["en", "ar"])
  test(`admin money output ${language}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((l) => {
      localStorage.setItem("language", l);
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
    }, language);
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.endsWith("/analytics/stream"))
        return route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: "",
        });
      let data: any = {};
      if (path.endsWith("/cart"))
        data = {
          items: [],
          summary: { total: 0, subtotal: 0, tax: 0, shipping: 0 },
        };
      else if (path.endsWith("/finance/reports")) data = report;
      else if (path.endsWith("/admin/overview")) data = {...overview,revenueTodayByCurrency:[{currency:"EGP",amount:12345678.9},{currency:"USD",amount:10}]};
      else if (path.endsWith("/analytics/summary"))
        data = {
          revenue: 125,
          unclassifiedOrderCount:2,
  unclassifiedTodayOrderCount:2,
  revenueByCurrency: groups,
          revenueChange: 0,
          orders: 4,
          ordersChange: 0,
          users: 1,
          products: 0,
          productsChange: 0,
        };
      else if (path.endsWith("/customers"))
        data = [
          {
            id: "qa-customer",
            email: "customer@test.local",
            ordersCount: 4,
            lifetimeValue: 125,
            lifetimeValueByCurrency: [{currency:"EGP",amount:12345678.9},{currency:"USD",amount:10}],unclassifiedOrderCount:2,
          },
        ];
      else if (path.endsWith("/orders"))
        data = [
          order("QA-EGP", "EGP", 100),
          order("QA-USD", "USD", 10),
          order("QA-OLD", null, 7),
        ];
      else if (path.endsWith("/analytics/funnel"))
        data = {
          visitors: 0,
          ordersCreated: 4,
          ordersPaid: 2,
          ordersApproved: 1,
          ordersDelivered: 0,
          conversionRate: 0,
        };
      else if (path.endsWith("/analytics/products")) data = [];
      return route.fulfill({
        json: {
          success: true,
          data,
          pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
        },
      });
    });
    for (const path of process.env.ADMIN_DASHBOARD_ONLY
      ? ["/admin/dashboard"]
      : ["/admin", "/admin/orders", "/admin/customers", "/admin/finance"]) {
      await page.goto(path);
      await expect(
        page.getByText("USD", { exact: false }).first(),
      ).toBeVisible();
      await expect(page.locator("main")).not.toContainText("$");
      if (path === "/admin/finance") {
        await expect(
          page.getByText(
            language === "ar"
              ? "طلبات بعملة غير معروفة، مستبعدة من الإجماليات"
              : "Unknown-currency orders excluded from totals",
            { exact: false },
          ),
        ).toBeVisible();
        await expect(
          page
            .getByText(
              language === "ar"
                ? "غير متاح، راجع عملة وتسجيل التسويات"
                : "Unavailable, reconcile settlement currency and records",
              { exact: false },
            )
            .first(),
        ).toBeVisible();
        await expect(page.locator("main")).not.toContainText("-250");
      }
      if (path === "/admin/dashboard")
        await page
          .getByRole("tab", {
            name: language === "ar" ? "المالية" : "Finance",
            exact: true,
          })
          .click();
      await page.screenshot({
        path: info.outputPath(`${path.replaceAll("/", "-")}-${language}.png`),
        fullPage: true,
      });
      if (path === "/admin/finance") {
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByText("USD", { exact: true })).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(`finance-mobile-${language}.png`),
          fullPage: true,
        });
      }
    }
    expect(errors).toEqual([]);
  });

// ---------------------------------------------------------------------------
// KPI card readability regression (synthetic fixtures, same route-mocked
// data as the test above). The money KPI cards on /admin/orders and
// /admin/customers must render the FULL title, every currency row and the
// unknown-currency unavailable-total caveat at phone and desktop widths,
// in English and Arabic (RTL). Assertions measure actual element bounds
// and text-range fit — never class names — so any return of single-line
// clipping (truncate / nowrap / overflow masking) fails them.
// ---------------------------------------------------------------------------

type KpiFit = {
  found: boolean;
  dir: string;
  titleClipped: boolean;
  titleLines: number;
  valueClipped: boolean;
  caveatFound: boolean;
  rowsInsideValue: boolean;
  cardOverflowX: boolean;
  cardInViewport: boolean;
  moneyTokensWhole: boolean;
};

async function measureKpiCard(
  page: Page,
  titleText: string,
  caveatText: string,
): Promise<KpiFit> {
  return page.evaluate(
    ({ titleText, caveatText }) => {
      const none = {
        found: false,
        dir: document.documentElement.dir,
        titleClipped: true,
        titleLines: 0,
        valueClipped: true,
        caveatFound: false,
        rowsInsideValue: false,
        cardOverflowX: true,
        cardInViewport: false,
        moneyTokensWhole: false,
      };
      const title = [...document.querySelectorAll("p")].find(
        (p) => p.textContent?.trim() === titleText,
      );
      const card = title?.closest('[data-slot="card"]');
      if (!title || !card) return none;
      const parts = [...(title.parentElement?.querySelectorAll(":scope > p") ?? [])];
      const value = parts[1];
      if (!value) return none;
      const clipped = (el: Element) =>
        el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      const range = document.createRange();
      range.selectNodeContents(title);
      const titleLines = range.getClientRects().length;
      const valueRect = value.getBoundingClientRect();
      const spans = [...value.querySelectorAll("span")];
      const caveat = spans.find((s) => s.textContent?.includes(caveatText));
      const summary = spans.find((s) => s.className.includes("flex-col"));
      const rows = summary ? [...summary.children] : [];
      const inside = (r: DOMRect, outer: DOMRect, pad: number) =>
        r.top >= outer.top - pad &&
        r.bottom <= outer.bottom + pad &&
        r.left >= outer.left - pad &&
        r.right <= outer.right + pad;
      return {
        moneyTokensWhole: [...value.querySelectorAll('bdi')].every(el=>{
          const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const text=node.textContent??'';for(const match of text.matchAll(/\S+/g)){const range=document.createRange();range.setStart(node,match.index!);range.setEnd(node,match.index!+match[0].length);if(range.getClientRects().length>1)return false}}return true;
        }),
        found: true,
        dir: document.documentElement.dir,
        titleClipped: clipped(title),
        titleLines,
        valueClipped: clipped(value),
        caveatFound: Boolean(caveat),
        rowsInsideValue:
          rows.length >= 3 &&
          rows.every((row) => inside(row.getBoundingClientRect(), valueRect, 1)),
        cardOverflowX: card.scrollWidth > card.clientWidth + 1,
        // The card's own box must sit inside the viewport. (A document-level
        // scrollWidth check is deliberately not asserted: the site header
        // chrome overflows 320px independently of these cards and is
        // outside this regression's scope.)
        cardInViewport: (() => {
          const r = card.getBoundingClientRect();
          return r.left >= -1 && r.right <= window.innerWidth + 1;
        })(),
      };
    },
    { titleText, caveatText },
  );
}

async function mockAdminApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith("/analytics/stream"))
      return route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
    let data: any = {};
    if (path.endsWith("/cart"))
      data = { items: [], summary: { total: 0, subtotal: 0, tax: 0, shipping: 0 } };
    else if (path.endsWith("/admin/overview")) data = {...overview,revenueTodayByCurrency:[{currency:"EGP",amount:12345678.9},{currency:"USD",amount:10}]};
    else if (path.endsWith("/customers"))
      data = [
        {
          id: "qa-customer",
          email: "customer@test.local",
          ordersCount: 4,
          lifetimeValue: 125,
          lifetimeValueByCurrency: [{currency:"EGP",amount:12345678.9},{currency:"USD",amount:10}],
          unclassifiedOrderCount: 2,
        },
      ];
    else if (path.endsWith("/orders"))
      data = [
        order("QA-EGP", "EGP", 100),
        order("QA-USD", "USD", 10),
        order("QA-OLD", null, 7),
      ];
    return route.fulfill({
      json: {
        success: true,
        data,
        pagination: { page: 1, limit: 20, total: 3, totalPages: 1 },
      },
    });
  });
}

const KPI_PAGES = [
  {
    path: "/admin/orders",
    title: "Order value today (not cancelled)",
    caveat: { en: "total unavailable", ar: "إجماليها غير متاح" },
  },
  {
    path: "/admin/customers",
    title: "Order value on page",
    caveat: { en: "total unavailable", ar: "إجماليها غير متاح" },
  },
] as const;

for (const language of ["en", "ar"] as const)
  for (const kpiPage of KPI_PAGES)
    test(`KPI card readability ${kpiPage.path} ${language}`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript((l) => {
        localStorage.setItem("language", l);
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
      }, language);
      await mockAdminApi(page);
      for (const width of [320, 360, 390, 1280]) {
        await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
        await page.goto(kpiPage.path);
        await expect(
          page.getByText(kpiPage.caveat[language], { exact: false }).first(),
        ).toBeVisible();
        const fit = await measureKpiCard(page, kpiPage.title, kpiPage.caveat[language]);
        expect(fit.found, `KPI card found at ${width}px`).toBe(true);
        expect(fit.dir, `document direction at ${width}px`).toBe(
          language === "ar" ? "rtl" : "ltr",
        );
        expect(fit.titleClipped, `title fully rendered at ${width}px`).toBe(false);
        expect(fit.moneyTokensWhole, `amount/currency tokens stay whole at ${width}px`).toBe(true);
        expect(fit.valueClipped, `value fully rendered at ${width}px`).toBe(false);
        expect(fit.caveatFound, `unavailable-total caveat present at ${width}px`).toBe(true);
        expect(
          fit.rowsInsideValue,
          `caveat + all currency rows inside the value bounds at ${width}px`,
        ).toBe(true);
        expect(fit.cardOverflowX, `no horizontal card overflow at ${width}px`).toBe(false);
        expect(fit.cardInViewport, `card box inside the viewport at ${width}px`).toBe(true);
        if (kpiPage.path === "/admin/orders" && (width === 320 || width === 390 || width === 1280)) {
          const titleEl = page.getByText(kpiPage.title, { exact: true });
          const cardEl = page.locator('[data-slot="card"]', { has: titleEl });
          await cardEl.screenshot({
            path: info.outputPath(`synthetic-kpi-orders-${language}-${width}.png`),
          });
        }
      }
      expect(errors).toEqual([]);
    });
