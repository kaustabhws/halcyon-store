export function formatPrice(amountMinor: bigint, currency = "INR"): string {
  const rupees = Number(amountMinor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

/** Like formatPrice but for already-summed paise held as a number. */
export function formatPaise(paise: number, currency = "INR"): string {
  return formatPrice(BigInt(Math.round(paise)), currency);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
