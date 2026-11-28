import { test, expect } from "@playwright/test";
test("admin review binds displayed submission and reloads on stale409", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "synthetic-admin",
        email: "admin@test.invalid",
        role: "ADMIN",
      }),
    );
    localStorage.setItem("accessToken", "synthetic-only");
  });
  const old = "11111111-1111-4111-8111-111111111111",
    current = "22222222-2222-4222-8222-222222222222";
  let submission = old;
  const sent: any[] = [];
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: any = {};
    if (path.endsWith("/samples/synthetic-sample/approve")) {
      sent.push(route.request().postDataJSON());
      if (sent.length === 1) {
        submission = current;
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Sample submission changed",
          }),
        });
      }
      return route.fulfill({ json: { success: true, data: {} } });
    }
    if (path.endsWith("/admin/samples"))
      return route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: "synthetic-sample",
              submissionId: submission,
              status: "pending",
              photoUrls: [],
              updatedAt: "2026-11-24T00:00:00Z",
              production: {
                id: "synthetic-run",
                status: "sample_production",
                progressPercent: 0,
                purchaseOrder: {
                  poNumber: "SYNTHETIC-PO",
                  order: {
                    id: "synthetic-order",
                    orderNumber: "SYNTHETIC-ORDER",
                  },
                },
              },
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      });
    if (path.endsWith("/auth/me"))
      data = {
        id: "synthetic-admin",
        email: "admin@test.invalid",
        role: "ADMIN",
      };
    if (path.endsWith("/cart")) data = { items: [], summary: { total: 0 } };
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/samples");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(
    page.getByText(
      "Sample changed. Review the current photos before trying again.",
    ),
  ).toBeVisible();
  await expect.poll(() => sent.length).toBe(1);
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect.poll(() => sent.length).toBe(2);
  expect(sent).toEqual([{ submissionId: old }, { submissionId: current }]);
  await page.screenshot({
    path: info.outputPath("sample-review-submission.png"),
  });
});
