// Monetary grouping never converts currencies or assigns a currency to history.
export function currencyKey(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value.trim())
    ? value.trim().toUpperCase()
    : null;
}
export function sumByCurrency(
  rows: Array<{ amount: unknown; currency?: unknown }>,
): Array<{ currency: string | null; amount: number }> {
  const sums = new Map<string | null, number>();
  for (const row of rows) {
    const currency = currencyKey(row.currency);
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) throw new Error("Invalid monetary amount");
    if (currency === null) {
      // Unknown values have no safe common unit. Report a count separately.
      continue;
    }
    sums.set(currency, (sums.get(currency) ?? 0) + amount);
  }
  return [...sums]
    .sort(([a], [b]) => (a ?? "~").localeCompare(b ?? "~"))
    .map(([currency, amount]) => ({ currency, amount }))
;
}
