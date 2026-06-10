/**
 * Coupon evaluation engine. Pure functions — no DB access — so the cart,
 * checkout, and admin previews can all share the same math.
 */

export type CouponType = "PERCENT" | "FIXED" | "FREE_SHIPPING";

export interface CouponInput {
  id: string;
  code: string;
  type: CouponType;
  /** percent 0-100 for PERCENT; minor units for FIXED; ignored for FREE_SHIPPING */
  value: number;
  currency: string | null;
  active: boolean;
  validFrom: Date | null;
  validTo: Date | null;
  minSubtotalMinor: bigint | null;
  maxRedemptions: number | null;
  redemptionsCount: number;
  perCustomerLimit: number | null;
  /** how many times THIS customer has redeemed it before, if known */
  customerRedemptionCount?: number;
}

export interface CouponContext {
  subtotalMinor: bigint;
  shippingMinor: bigint;
  currency: string;
  now?: Date;
}

export type CouponValidation =
  | { ok: true }
  | { ok: false; code: CouponInvalidReason; message: string };

export type CouponInvalidReason =
  | "inactive"
  | "not_started"
  | "expired"
  | "min_subtotal"
  | "currency_mismatch"
  | "max_redemptions"
  | "per_customer_limit";

export function validateCoupon(
  coupon: CouponInput,
  ctx: CouponContext,
): CouponValidation {
  const now = ctx.now ?? new Date();

  if (!coupon.active) {
    return { ok: false, code: "inactive", message: "This code is not active" };
  }
  if (coupon.validFrom && coupon.validFrom > now) {
    return {
      ok: false,
      code: "not_started",
      message: `This code becomes valid on ${coupon.validFrom.toDateString()}`,
    };
  }
  if (coupon.validTo && coupon.validTo < now) {
    return { ok: false, code: "expired", message: "This code has expired" };
  }
  if (
    coupon.minSubtotalMinor != null &&
    ctx.subtotalMinor < coupon.minSubtotalMinor
  ) {
    return {
      ok: false,
      code: "min_subtotal",
      message: `Order subtotal too low for this code`,
    };
  }
  if (coupon.currency && coupon.currency !== ctx.currency) {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "This code is for a different currency",
    };
  }
  if (
    coupon.maxRedemptions != null &&
    coupon.redemptionsCount >= coupon.maxRedemptions
  ) {
    return {
      ok: false,
      code: "max_redemptions",
      message: "This code has been used up",
    };
  }
  if (
    coupon.perCustomerLimit != null &&
    coupon.customerRedemptionCount != null &&
    coupon.customerRedemptionCount >= coupon.perCustomerLimit
  ) {
    return {
      ok: false,
      code: "per_customer_limit",
      message: "You've already used this code",
    };
  }
  return { ok: true };
}

export interface DiscountResult {
  discountMinor: bigint;
  shippingDiscountMinor: bigint;
}

/**
 * Apply a coupon to the cart context and return the discount amounts.
 * Always rounds down so we never go below 0.
 */
export function applyCoupon(
  coupon: CouponInput,
  ctx: CouponContext,
): DiscountResult {
  if (coupon.type === "PERCENT") {
    const pct = Math.max(0, Math.min(100, coupon.value));
    // floor-divide so totals don't drift into sub-paise
    const discount = (ctx.subtotalMinor * BigInt(pct)) / 100n;
    return {
      discountMinor: clampToMax(discount, ctx.subtotalMinor),
      shippingDiscountMinor: 0n,
    };
  }
  if (coupon.type === "FIXED") {
    const requested = BigInt(coupon.value);
    return {
      discountMinor: clampToMax(requested, ctx.subtotalMinor),
      shippingDiscountMinor: 0n,
    };
  }
  // FREE_SHIPPING
  return {
    discountMinor: 0n,
    shippingDiscountMinor: ctx.shippingMinor,
  };
}

function clampToMax(value: bigint, max: bigint): bigint {
  if (value < 0n) return 0n;
  if (value > max) return max;
  return value;
}

/** Normalize a code as users type it. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
