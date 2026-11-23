import { test, expect } from "@playwright/test";
for (const language of ["en", "ar"])
  for (const width of [320, 1280])
    test(`saved review checkout gates new payment ${language} ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        ({ language }) => {
          localStorage.setItem("language", language);
          localStorage.setItem(
            "user",
            JSON.stringify({
              id: "synthetic-checkout-user",
              email: "synthetic@test.invalid",
              name: "Synthetic Audit",
              role: "TRADER",
            }),
          );
          localStorage.setItem("accessToken", "synthetic-test-only");
          localStorage.setItem(
            "packagepro-checkout-attempt-v1:synthetic-checkout-user",
            JSON.stringify({
              key: "synthetic-checkout-key",
              body: {
                shippingAddress: {
                  name: "Synthetic",
                  phone: "test",
                  street: "Test",
                  city: "Cairo",
                  country: "EG",
                  postalCode: "00000",
                },
              },
            }),
          );
        },
        { language },
      );
      let posts = 0;
      await page.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        if (
          route.request().method() === "POST" &&
          url.pathname.endsWith("/checkout")
        )
          posts++;
        const data = url.pathname.endsWith("/checkout/attempt")
          ? {
              attemptState: "review_required",
              cartChanged: true,
              orderId: "synthetic-audit-order",
              provider: "fawry",
              providerRef: "synthetic-reference",
            }
          : url.pathname.endsWith("/cart")
            ? {
                items: [],
                summary: { subtotal: 0, tax: 0, shipping: 0, total: 0 },
                currency: "EGP",
              }
            : [];
        await route.fulfill({ json: { success: true, data } });
      });
      await page.goto("/checkout");
      await expect(
        page.getByRole("button", {
          name: language === "ar" ? "مراجعة الطلب" : "Review order",
        }),
      ).toBeVisible();
      await expect(
        page.getByText(
          language === "ar"
            ? "تغيرت السلة. راجع الكميات في الطلب والسلة قبل أي دفعة أخرى."
            : "The cart changed. Review order and cart quantities before another payment.",
        ),
      ).toBeVisible();
      expect(posts).toBe(0);
      await page.screenshot({
        path: `/downloads/checkout-recovery-gate-${language}-${width}.png`,
        fullPage: true,
      });
      await page.reload();
      await expect(
        page.getByRole("button", {
          name: language === "ar" ? "مراجعة الطلب" : "Review order",
        }),
      ).toBeVisible();
      expect(posts).toBe(0);
    });
for (const language of ["en", "ar"])
  test(`malformed checkout storage blocks payment without crashing ${language}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addInitScript(
      ({ language }) => {
        localStorage.setItem("language", language);
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: "synthetic-checkout-user",
            email: "synthetic@test.invalid",
            name: "Synthetic Audit",
            role: "TRADER",
          }),
        );
        localStorage.setItem("accessToken", "synthetic-test-only");
        localStorage.setItem(
          "packagepro-checkout-attempt-v1:synthetic-checkout-user",
          "{",
        );
      },
      { language },
    );
    let posts = 0;
    await page.route("**/api/**", async (route) => {
      if (route.request().method() === "POST") posts++;
      await route.fulfill({
        json: {
          success: true,
          data: {
            items: [],
            summary: { subtotal: 0, total: 0 },
            currency: "EGP",
          },
        },
      });
    });
    await page.goto("/checkout");
    await expect(page.getByRole("status")).toContainText(
      language === "ar" ? "تعذر التحقق" : "Could not verify",
    );
    expect(posts).toBe(0);
    await page.screenshot({
      path: `/downloads/checkout-malformed-${language}-320.png`,
      fullPage: true,
    });
  });
// Real React Stripe wrapper, synthetic window.Stripe. No Stripe network/payment.
for (const resume of [false, true])
  test(`Elements client-secret contract ${resume ? "resume" : "initial"}`, async ({
    page,
  }) => {
    await page.route("https://js.stripe.com/**", (r) => r.abort());
    await page.addInitScript(
      ({ resume }) => {
        localStorage.setItem("language", "en");
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: "synthetic-checkout-user",
            email: "synthetic@test.invalid",
            name: "Synthetic Audit",
            role: "TRADER",
          }),
        );
        localStorage.setItem("accessToken", "synthetic-test-only");
        if (resume)
          localStorage.setItem(
            "packagepro-checkout-attempt-v1:synthetic-checkout-user",
            JSON.stringify({
              key: "synthetic-checkout-key",
              body: {
                shippingAddress: {
                  name: "Synthetic",
                  phone: "test",
                  street: "Test",
                  city: "Cairo",
                  country: "EG",
                  postalCode: "00000",
                },
              },
            }),
          );
        const w = window as any;
        w.__stripeCalls = [];
        w.Stripe = () => ({
          createToken() {},
          createPaymentMethod() {},
          confirmCardPayment() {},
          _registerWrapper() {},
          registerAppInfo() {},
          confirmPayment: async (options: any) => {
            w.__stripeCalls.push({
              action: "confirm",
              secret: options.clientSecret,
            });
            return { paymentIntent: { status: "processing" } };
          },
          elements: (options: any) => {
            w.__stripeCalls.push({
              action: "elements",
              secret: options.clientSecret,
            });
            if (options.clientSecret !== "synthetic-contract-secret")
              throw new Error("Elements mounted without correct secret");
            return {
              update() {},
              create: () => {
                let node: HTMLElement | null = null;
                const handlers: any = {};
                return {
                  on: (event: string, fn: any) => {
                    handlers[event] = fn;
                  },
                  off() {},
                  update() {},
                  mount: (target: HTMLElement) => {
                    node = document.createElement("div");
                    node.textContent =
                      "Synthetic payment element, no real payment";
                    node.setAttribute(
                      "data-testid",
                      "synthetic-payment-element",
                    );
                    target.appendChild(node);
                    handlers.ready?.();
                  },
                  destroy: () => node?.remove(),
                };
              },
            };
          },
        });
      },
      { resume },
    );
    let posts = 0;
    const result = {
      attemptId: "synthetic-attempt",
      attemptState: "completed",
      orderId: "synthetic-order",
      orderNumber: "SAVED-QA-1",
      total: 73.25,
      currency: "SAR",
      provider: "stripe",
      providerRef: "pi_synthetic",
      paymentIntentId: "pi_synthetic",
      paymentState: "pending",
      clientSecret: "synthetic-contract-secret",
      cartChanged: false,
    };
    await page.route("**/api/**", async (r) => {
      const path = new URL(r.request().url()).pathname;
      if (path.endsWith("/checkout") && r.request().method() === "POST") {
        posts++;
        expect(r.request().headers()["idempotency-key"]).toBeTruthy();
        await r.fulfill({ json: { success: true, data: result } });
        return;
      }
      if (path.endsWith("/orders/synthetic-order")) {
        expect(r.request().headers().authorization).toBe(
          "Bearer synthetic-test-only",
        );
        await r.fulfill({
          json: {
            success: true,
            data: {
              id: "synthetic-order",
              orderNumber: "SAVED-QA-1",
              total: 73.25,
              subtotal: 73.25,
              tax: 0,
              shippingCost: 0,
              currency: "SAR",
              status: "pending_review",
              paymentStatus: "pending",
              items: [],
              shippingAddress: {
                name: "Synthetic Recipient",
                street: "Saved Street 17",
                city: "Cairo",
                country: "EG",
                postalCode: "00000",
              },
            },
          },
        });
        return;
      }
      const data = path.endsWith("/checkout/attempt")
        ? result
        : path.endsWith("/cart")
          ? {
              id: "qa-cart",
              items: [
                {
                  id: "qa-line",
                  productType: "box",
                  quantity: 2,
                  unitPrice: 10,
                  totalPrice: 20,
                  dimensions: {
                    length: 10,
                    width: 10,
                    height: 10,
                    unit: "mm",
                  },
                },
              ],
              summary: { subtotal: 20, tax: 0, shipping: 0, total: 20 },
              currency: "EGP",
            }
          : [];
      await r.fulfill({ json: { success: true, data } });
    });
    await page.goto("/checkout");
    if (!resume) {
      await expect(page.locator("#name")).toBeVisible();
      for (const [id, value] of Object.entries({
        name: "Synthetic",
        phone: "test",
        email: "synthetic@test.invalid",
        street: "Test",
        city: "Cairo",
        state: "Cairo",
        postalCode: "00000",
        country: "EG",
      }))
        await page.locator("#" + id).fill(value);
      await page.getByRole("button", { name: "Continue to Payment" }).click();
      expect(await page.evaluate(() => (window as any).__stripeCalls)).toEqual(
        [],
      );
      await page
        .getByRole("button", { name: "Prepare order and payment", exact: true })
        .click();
    }
    await expect(
      page.getByRole("region", { name: "Saved order to pay" }),
    ).toContainText("SAVED-QA-1");
    await expect(
      page.getByRole("region", { name: "Saved order to pay" }),
    ).toContainText("SAR 73.25");
    await expect(
      page.getByRole("region", { name: "Saved order to pay" }),
    ).not.toContainText("20.00 EGP");
    await expect(page.getByTestId("synthetic-payment-element")).toBeVisible();
    await page.screenshot({
      path: `/downloads/checkout-sdk-${resume ? "resume" : "initial"}.png`,
      fullPage: true,
    });
    expect(posts).toBe(resume ? 0 : 1);
    if (resume) {
      await page
        .getByRole("link", { name: "Review saved order and shipping address" })
        .click();
      await expect(
        page.getByText("Saved Street 17", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByText("Synthetic Recipient", { exact: false }),
      ).toBeVisible();
      await page.screenshot({
        path: "/downloads/checkout-saved-order-review.png",
        fullPage: true,
      });
      await page.goBack();
      await expect(page.getByTestId("synthetic-payment-element")).toBeVisible();
    }
    await page.getByRole("button", { name: "Pay", exact: true }).click();
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (window as any).__stripeCalls.filter(
              (x: any) => x.action === "confirm",
            ).length,
        ),
      )
      .toBe(1);
    expect(posts).toBe(resume ? 0 : 1);
    expect(
      await page.evaluate(() =>
        localStorage.getItem(
          "packagepro-checkout-attempt-v1:synthetic-checkout-user",
        ),
      ),
    ).toBeTruthy();
  });
for (const missing of ["currency", "total", "orderNumber"])
  test(`saved payment missing ${missing} never mounts Elements`, async ({
    page,
  }) => {
    await page.route("https://js.stripe.com/**", (r) => r.abort());
    await page.addInitScript(() => {
      localStorage.setItem("language", "en");
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: "synthetic-checkout-user",
          email: "synthetic@test.invalid",
          name: "Synthetic Audit",
          role: "TRADER",
        }),
      );
      localStorage.setItem("accessToken", "synthetic-test-only");
      localStorage.setItem(
        "packagepro-checkout-attempt-v1:synthetic-checkout-user",
        JSON.stringify({
          key: "synthetic-checkout-key",
          body: {
            shippingAddress: {
              name: "Synthetic",
              phone: "test",
              street: "Test",
              city: "Cairo",
              country: "EG",
              postalCode: "00000",
            },
          },
        }),
      );
    });
    const result: any = {
      attemptState: "completed",
      orderId: "synthetic-order",
      orderNumber: "SAVED-QA",
      total: 73.25,
      currency: "SAR",
      provider: "stripe",
      paymentState: "pending",
      clientSecret: "synthetic-contract-secret",
    };
    delete result[missing];
    let posts = 0;
    await page.route("**/api/**", async (r) => {
      if (r.request().method() === "POST") posts++;
      const data = new URL(r.request().url()).pathname.endsWith(
        "/checkout/attempt",
      )
        ? result
        : { items: [], summary: { total: 999 }, currency: "USD" };
      await r.fulfill({ json: { success: true, data } });
    });
    await page.goto("/checkout");
    await expect(
      page.getByText(
        "Saved order amount could not be verified. Review the order before paying.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pay", exact: true }),
    ).toHaveCount(0);
    expect(posts).toBe(0);
  });
