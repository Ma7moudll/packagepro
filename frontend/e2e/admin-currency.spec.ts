import { test, expect } from "@playwright/test";
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
      else if (path.endsWith("/admin/overview")) data = overview;
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
            lifetimeValueByCurrency: groups,unclassifiedOrderCount:2,
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
