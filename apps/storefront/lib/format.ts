/**
 * Format a BIGINT minor-unit price as INR. The DB returns bigints because
 * JS numbers can lose precision at the 53-bit boundary; the formatter
 * converts to a number only after dividing by 100.
 */
export function formatPrice(amountMinor: bigint, currency = "INR"): string {
  const rupees = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export function discountPercent(price: bigint, compareAt: bigint | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  const pct = Number(((compareAt - price) * 100n) / compareAt);
  return Math.round(pct);
}
