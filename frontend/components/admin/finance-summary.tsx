"use client";
import { useLanguage } from "@/providers/language-provider";
import type { FinancialReport } from "@/lib/api/finance";
import { Money } from "./money";
export function FinanceSummary({ report }: { report: FinancialReport | null }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  if (!report?.byCurrency)
    return (
      <p>{ar ? "تفصيل العملة غير متاح" : "Currency breakdown unavailable"}</p>
    );
  return (
    <div className="space-y-4 pr-16 sm:pr-0" dir={ar ? "rtl" : "ltr"}>
      {(report.unclassifiedOrderCount ?? 0) > 0 && (
        <p role="status">
          {ar
            ? "طلبات بعملة غير معروفة، مستبعدة من الإجماليات"
            : "Unknown-currency orders excluded from totals"}
          : {report.unclassifiedOrderCount}
        </p>
      )}
      {!report.byCurrency.length && (
        <p>
          {ar ? "لا توجد إجماليات بعملة معروفة" : "No known-currency totals"}
        </p>
      )}
      {report.byCurrency.map((g) => (
        <section className="rounded border p-4" key={g.currency}>
          <h3 className="font-semibold mb-3">{g.currency}</h3>
          <dl className="space-y-2">
            {[
              [ar ? "الإيرادات" : "Revenue", g.revenue],
              [
                ar ? "متوسط قيمة الطلب" : "Average order value",
                g.averageOrderValue,
              ],
              [
                ar ? "مبالغ التسويات المسجلة" : "Recorded settlement amounts",
                g.vendorPayments,
              ],
              [
                ar
                  ? "الإيرادات بعد مبالغ التسويات"
                  : "Revenue less recorded settlement amounts",
                g.profit,
              ],
              [
                ar ? "الضرائب (للمعلومات فقط)" : "Taxes (informational)",
                g.taxes,
              ],
            ].map(([label, value]) => (
              <div
                className="flex flex-wrap justify-between gap-2"
                key={String(label)}
              >
                <dt>{label}</dt>
                <dd>
                  {value === null ? (
                    <span>
                      {ar
                        ? "غير متاح، راجع عملة وتسجيل التسويات"
                        : "Unavailable, reconcile settlement currency and records"}
                    </span>
                  ) : (
                    <Money amount={value} currency={g.currency} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-sm mt-3">
            {ar
              ? "ليس صافي ربح محاسبي. تشمل التسويات كل الحالات، بما فيها المعلقة والفاشلة. لا توجد تحويلات عملة أو خصومات مكررة."
              : "Not accounting net profit. Recorded settlements include all statuses, including pending or failed. No currency conversion or duplicate cost deductions."}
          </p>
        </section>
      ))}
    </div>
  );
}
