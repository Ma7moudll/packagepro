// No FX, default currency or silent rounding for a saved payment amount.
export function savedPaymentAmount(
  total: unknown,
  currency: unknown,
  locale = "en-US",
): string | null {
  if (
    typeof total !== "number" ||
    !Number.isFinite(total) ||
    total < 0 ||
    typeof currency !== "string" ||
    !/^[A-Z]{3}$/.test(currency)
  )
    return null;
  try {
    const format = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
    });
    const digits = format.resolvedOptions().maximumFractionDigits;
    if (
      digits === undefined ||
      Math.abs(total * 10 ** digits - Math.round(total * 10 ** digits)) >
        0.000001
    )
      return null;
    return format.format(total);
  } catch {
    return null;
  }
}
