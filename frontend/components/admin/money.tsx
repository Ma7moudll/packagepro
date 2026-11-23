"use client";
import { useLanguage } from "@/providers/language-provider";
export type MoneyGroup = { currency: string | null; amount: number };
export function moneyText(
  amount: unknown,
  currency: unknown,
  language = "en",
): string {
  const value = Number(amount);
  const code =
    typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency.trim())
      ? currency.trim().toUpperCase()
      : null;
  const label =
    code ?? (language === "ar" ? "عملة غير معروفة" : "Unknown currency");
  return `${Number.isFinite(value) ? value.toLocaleString(language === "ar" ? "ar-EG" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"} ${label}`;
}
export function Money({
  amount,
  currency,
}: {
  amount: unknown;
  currency: unknown;
}) {
  const { language } = useLanguage();
  return <bdi>{moneyText(amount, currency, language)}</bdi>;
}
export function MoneySummary({ groups, unclassifiedCount = 0 }: { groups?: MoneyGroup[]; unclassifiedCount?: number }) {
  const { language } = useLanguage();
  if (!groups)
    return (
      <span>
        {language === "ar"
          ? "تفصيل العملة غير متاح"
          : "Currency breakdown unavailable"}
      </span>
    );
  if (!groups.length && !unclassifiedCount)
    return <span>{language === "ar" ? "لا توجد مبالغ" : "No amounts"}</span>;
  return (
    <span className="flex flex-col gap-1 min-w-0 break-words">
      {unclassifiedCount>0&&<span className="text-sm font-normal">{language==='ar'?'طلبات بعملة غير معروفة، إجماليها غير متاح':'Unknown-currency orders, total unavailable'}: {unclassifiedCount}</span>}
      {groups.map((g, i) => (
        <Money
          key={`${g.currency}-${i}`}
          amount={g.amount}
          currency={g.currency}
        />
      ))}
    </span>
  );
}
export function mergeMoneyGroups(groups: MoneyGroup[]): MoneyGroup[] {
  const sums = new Map<string | null, number>();
  const unknown = groups.filter((g) => !g.currency);
  for (const g of groups.filter((g) => g.currency))
    sums.set(g.currency, (sums.get(g.currency) ?? 0) + g.amount);
  return [...sums]
    .map(([currency, amount]) => ({ currency, amount }))
    .concat(unknown);
}
