import { describe, it, expect, vi } from "vitest";
const db = vi.hoisted(() => ({
  order: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  vendor: { count: vi.fn() },
  customer: { findMany: vi.fn(), count: vi.fn() },
  handshake: { count: vi.fn() },
  settlement: { count: vi.fn() },
}));
vi.mock("../../lib/prisma", () => ({ prisma: db }));
import {
  currencyFinancialMetrics,
  financeReportingService,
} from "./reporting.service";
import { analyticsService } from "../analytics/analytics.service";
import { publicStatsService } from "../public/public.service";
import { adminController } from "../admin/admin.controller";
import { sumByCurrency } from "../../utils/currency-summary";
describe("admin currency safety", () => {
  it("separates EGP/USD, excludes unclassified historical amounts without adding them", () => {
    expect(
      sumByCurrency([
        { currency: "egp", amount: 100 },
        { currency: "USD", amount: 10 },
        { currency: null, amount: 7 },
          ]),
    ).toEqual([
      { currency: "EGP", amount: 100 },
      { currency: "USD", amount: 10 },
    ]);
  });
  it("does not infer FX or use convertedAmount; missing settlements cannot imply zero cost", () => {
    const result = currencyFinancialMetrics([
      {
        currency: "EGP",
        total: 100,
        tax: 14,
        settlements: [{ currency: "EGP", amount: 60 }],
      },
      {
        currency: "USD",
        total: 10,
        tax: 1,
        settlements: [{ currency: "EGP", amount: 300 }],
      },
      { currency: "EUR", total: 50, tax: 2, settlements: [] },
      { currency: null, total: 900, tax: 9, settlements: [] },
    ]);
    expect(result).toHaveLength(3);
    expect(result.find((g) => g.currency === "EGP")).toMatchObject({
      revenue: 100,
      profit: 40,
      costs: 60,
    });
    expect(result.find((g) => g.currency === "USD")).toMatchObject({
      revenue: 10,
      profit: null,
      costStatus: "unreconciled",
    });
    expect(result.find((g) => g.currency === "EUR")).toMatchObject({
      revenue: 50,
      profit: null,
      costs: null,
    });
  });
  it("never reports profit for an incomplete currency group", () => {
    expect(
      currencyFinancialMetrics([
        {
          currency: "EGP",
          total: 100,
          tax: 14,
          settlements: [{ currency: "EGP", amount: 60 }],
        },
        { currency: "EGP", total: 40, tax: 0, settlements: [] },
      ])[0].profit,
    ).toBeNull();
  });
});

describe("additive admin currency API contracts", () => {
  it("finance service returns segregated metrics and unknown count while retaining legacy fields", async () => {
    db.order.findMany.mockResolvedValue([
      {
        currency: "EGP",
        total: 100,
        tax: 14,
        settlements: [{ currency: "EGP", amount: 60 }],
      },
      {
        currency: "USD",
        total: 10,
        tax: 1,
        settlements: [{ currency: "EGP", amount: 300 }],
      },
      { currency: null, total: 8, tax: 0, settlements: [] },
    ]);
    const result = await financeReportingService.generateReport(
      new Date("2026-11-01"),
      new Date("2026-11-23"),
    );
    expect(result.unclassifiedOrderCount).toBe(1);
    expect(
      result.byCurrency.map((g) => [g.currency, g.revenue, g.profit]),
    ).toEqual([
      ["EGP", 100, 40],
      ["USD", 10, null],
    ]);
    expect(result.revenue).toBe(118); // Legacy compatibility, NOT safe for monetary display.
  });
  it("overview includes explicit per-currency totals and unclassified amounts", async () => {
    db.order.count.mockResolvedValue(4);
    db.order.aggregate.mockResolvedValue({ _sum: { total: 125 }, _count: 4 });
    db.order.groupBy.mockImplementation(async (args: any) =>
      args.by[0] === "currency"
        ? [
            { currency: "EGP", _sum: { total: 100 } },
            { currency: "USD", _sum: { total: 10 } },
          ]
        : [],
    );
    db.order.count.mockResolvedValue(2);
    const send = vi.fn();
    await adminController.getOverview({} as any, { send } as any);
    expect(send.mock.calls[0][0].data.unclassifiedOrderCount).toBe(2);
    expect(db.order.count).toHaveBeenCalledWith({where:{status:{not:"cancelled"},currency:null}});
    expect(send.mock.calls[0][0].data.revenueByCurrency).toEqual([
      { currency: "EGP", amount: 100 },
      { currency: "USD", amount: 10 },
    ]);
  });
  it("customer LTV keeps currencies and ignores cancelled orders", async () => {
    db.customer.findMany.mockResolvedValue([
      {
        id: "c1",
        orders: [
          { total: 100, currency: "EGP", status: "completed" },
          { total: 10, currency: "USD", status: "completed" },
          { total: 99, currency: "EGP", status: "cancelled" },
        ],
      },
    ]);
    db.customer.count.mockResolvedValue(1);
    const send = vi.fn();
    await adminController.getCustomers({ query: {} } as any, { send } as any);
    expect(send.mock.calls[0][0].data[0].lifetimeValueByCurrency).toEqual([
      { currency: "EGP", amount: 100 },
      { currency: "USD", amount: 10 },
    ]);
    expect(
      db.customer.findMany.mock.calls.at(-1)?.[0].include.orders.select
        .currency,
    ).toBe(true);
  });
});

it("admin summary service includes grouped currency amounts, not public scalar display", async () => {
  vi.spyOn(publicStatsService, "getStats").mockResolvedValue({
    transactionVolume: { value: 118 },
    activeTraders: { value: 2 },
  });
  vi.spyOn(analyticsService, "getConversionFunnel").mockResolvedValue({
    ordersCreated: 3,
  } as any);
  db.order.groupBy.mockResolvedValue([
    { currency: "EGP", _sum: { total: 100 } },
    { currency: "USD", _sum: { total: 10 } },
  ]);
  db.order.count.mockResolvedValue(1);
  const summary = await analyticsService.getDashboardSummary();
  expect(summary.revenueByCurrency).toEqual([
    { currency: "EGP", amount: 100 },
    { currency: "USD", amount: 10 },
  ]);
});
