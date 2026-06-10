export type Currency = "INR";

export interface Money {
  amountMinor: bigint;
  currency: Currency;
}

export const INR_PAISE_PER_RUPEE = 100n;

export function rupees(amount: number): Money {
  if (!Number.isFinite(amount)) {
    throw new Error("rupees() requires a finite number");
  }
  return {
    amountMinor: BigInt(Math.round(amount * 100)),
    currency: "INR",
  };
}

export function paise(amountMinor: bigint | number): Money {
  return {
    amountMinor: typeof amountMinor === "bigint" ? amountMinor : BigInt(amountMinor),
    currency: "INR",
  };
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

export function multiplyMoney(m: Money, factor: number): Money {
  return {
    amountMinor: BigInt(Math.round(Number(m.amountMinor) * factor)),
    currency: m.currency,
  };
}

export function formatINR(m: Money): string {
  if (m.currency !== "INR") {
    throw new Error(`formatINR called with ${m.currency}`);
  }
  const rupees = Number(m.amountMinor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(rupees);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}
