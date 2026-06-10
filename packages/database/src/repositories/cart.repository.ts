import { prisma } from "../client.ts";
import type { Prisma } from "@prisma/client";
import {
  applyCoupon,
  validateCoupon,
  normalizeCode,
  type CouponInput,
  type CouponValidation,
} from "@ecom/shared/coupons";

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              // We pull all media (not just the primary) so itemToView can
              // prefer a variant-tagged image when useVariantImages is on.
              media: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
              brand: true,
            },
          },
          inventory: true,
          attributes: {
            include: { attributeValue: { include: { attribute: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartRow = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
type CartItemRow = CartRow["items"][number];

export type CartView = {
  id: string;
  customerId: string | null;
  anonymousToken: string | null;
  currency: string;
  subtotalMinor: bigint;
  discountMinor: bigint;
  shippingMinor: bigint;
  totalMinor: bigint;
  couponCode: string | null;
  itemCount: number;
  items: Array<{
    id: string;
    variantId: string;
    productId: string;
    productSlug: string;
    productName: string;
    variantName: string | null;
    sku: string;
    brandName: string | null;
    imageUrl: string | null;
    quantity: number;
    unitPriceMinor: bigint;
    lineTotalMinor: bigint;
    currency: string;
    available: number;
    attributes: Array<{
      code: string;
      label: string;
      value: string;
      valueLabel: string;
      swatchHex: string | null;
    }>;
  }>;
};

function toView(cart: CartRow): CartView {
  const items = cart.items.map(itemToView);
  return {
    id: cart.id,
    customerId: cart.customerId,
    anonymousToken: cart.anonymousToken,
    currency: cart.currency,
    subtotalMinor: cart.subtotalMinor,
    discountMinor: cart.discountMinor,
    shippingMinor: cart.shippingMinor,
    totalMinor: cart.totalMinor,
    couponCode: cart.couponCode,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    items,
  };
}

function itemToView(item: CartItemRow): CartView["items"][number] {
  const p = item.variant.product;
  // Prefer the image tagged to this variant's value of the product's image
  // attribute (e.g. its Color). Fall back to the primary image otherwise.
  let primary = p.media[0];
  if (p.useVariantImages && p.imageAttributeId) {
    const vav = item.variant.attributes.find(
      (a) => a.attributeValue.attribute.id === p.imageAttributeId,
    );
    const valueId = vav?.attributeValue.id;
    const tagged = valueId
      ? p.media.find((m) => m.attributeValueId === valueId)
      : undefined;
    primary = tagged ?? p.media[0];
  }
  const available = item.variant.inventory.reduce(
    (sum, i) => sum + (i.onHand - i.reserved),
    0,
  );
  const attributes = item.variant.attributes
    .map((a) => ({
      code: a.attributeValue.attribute.code,
      label: a.attributeValue.attribute.label,
      value: a.attributeValue.value,
      valueLabel: a.attributeValue.label,
      swatchHex: a.attributeValue.swatchHex,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  return {
    id: item.id,
    variantId: item.variantId,
    productId: p.id,
    productSlug: p.slug,
    productName: p.name,
    variantName: item.variant.name,
    sku: item.variant.sku,
    brandName: p.brand?.name ?? null,
    imageUrl: primary?.url ?? null,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
    lineTotalMinor: item.unitPriceMinor * BigInt(item.quantity),
    currency: item.currency,
    available,
    attributes,
  };
}

export async function findCartByToken(token: string): Promise<CartView | null> {
  const cart = await prisma.cart.findUnique({
    where: { anonymousToken: token },
    include: cartInclude,
  });
  return cart ? toView(cart) : null;
}

export async function findCartByCustomerId(customerId: string): Promise<CartView | null> {
  const cart = await prisma.cart.findFirst({
    where: { customerId },
    orderBy: { updatedAt: "desc" },
    include: cartInclude,
  });
  return cart ? toView(cart) : null;
}

export async function createCart(input: {
  anonymousToken?: string;
  customerId?: string;
}): Promise<CartView> {
  const cart = await prisma.cart.create({
    data: {
      anonymousToken: input.anonymousToken,
      customerId: input.customerId,
      currency: "INR",
    },
    include: cartInclude,
  });
  return toView(cart);
}

/**
 * Idempotent add: increments quantity if the variant is already in the cart.
 * Snapshots unit price at add time. Recomputes totals.
 */
export async function addToCart(input: {
  cartId: string;
  variantId: string;
  quantity: number;
}): Promise<CartView> {
  if (input.quantity < 1) throw new Error("quantity must be >= 1");

  const variant = await prisma.variant.findUniqueOrThrow({
    where: { id: input.variantId },
    include: {
      prices: { take: 1, orderBy: { updatedAt: "desc" } },
      inventory: true,
    },
  });
  const price = variant.prices[0];
  if (!price) throw new Error("variant has no price");

  const available = variant.inventory.reduce(
    (sum, i) => sum + (i.onHand - i.reserved),
    0,
  );

  await prisma.$transaction(async (tx) => {
    const existing = await tx.cartItem.findUnique({
      where: { cartId_variantId: { cartId: input.cartId, variantId: input.variantId } },
    });
    const nextQty = (existing?.quantity ?? 0) + input.quantity;
    if (nextQty > available) {
      throw new Error(`only ${available} available`);
    }
    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQty },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: input.cartId,
          variantId: input.variantId,
          quantity: input.quantity,
          unitPriceMinor: price.amountMinor,
          currency: price.currency,
        },
      });
    }
    await recomputeTotals(tx, input.cartId);
  });

  const cart = await prisma.cart.findUniqueOrThrow({
    where: { id: input.cartId },
    include: cartInclude,
  });
  return toView(cart);
}

export async function setQuantity(input: {
  cartId: string;
  itemId: string;
  quantity: number;
}): Promise<CartView> {
  await prisma.$transaction(async (tx) => {
    if (input.quantity <= 0) {
      await tx.cartItem.delete({ where: { id: input.itemId } });
    } else {
      const item = await tx.cartItem.findUniqueOrThrow({
        where: { id: input.itemId },
        include: { variant: { include: { inventory: true } } },
      });
      const available = item.variant.inventory.reduce(
        (sum, i) => sum + (i.onHand - i.reserved),
        0,
      );
      if (input.quantity > available) throw new Error(`only ${available} available`);
      await tx.cartItem.update({
        where: { id: input.itemId },
        data: { quantity: input.quantity },
      });
    }
    await recomputeTotals(tx, input.cartId);
  });

  const cart = await prisma.cart.findUniqueOrThrow({
    where: { id: input.cartId },
    include: cartInclude,
  });
  return toView(cart);
}

export async function removeItem(input: { cartId: string; itemId: string }): Promise<CartView> {
  await prisma.$transaction(async (tx) => {
    await tx.cartItem.delete({ where: { id: input.itemId } });
    await recomputeTotals(tx, input.cartId);
  });
  const cart = await prisma.cart.findUniqueOrThrow({
    where: { id: input.cartId },
    include: cartInclude,
  });
  return toView(cart);
}

/**
 * Merge an anonymous cart into a customer cart on login.
 * Anonymous cart is consumed; conflicts resolved by summing quantities.
 *
 * Pre-reads happen outside the tx to keep the tx body write-only — the
 * default 5s tx timeout was being hit for carts of 5+ items on cold Neon
 * connections, which silently dropped the merge and lost the customer's
 * items.
 */
export async function mergeAnonymousIntoCustomerCart(input: {
  anonymousToken: string;
  customerId: string;
}): Promise<CartView> {
  // Pre-reads outside the tx
  const anon = await prisma.cart.findUnique({
    where: { anonymousToken: input.anonymousToken },
    include: { items: true },
  });
  const existingCustomerCart = await prisma.cart.findFirst({
    where: { customerId: input.customerId },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });

  // If the customer already has a cart, build the conflict map up-front so
  // the tx only does writes.
  type WriteOp =
    | { kind: "update"; itemId: string; quantity: number }
    | {
        kind: "create";
        variantId: string;
        quantity: number;
        unitPriceMinor: bigint;
        currency: string;
      };
  const operations: WriteOp[] = [];
  if (anon) {
    const existingByVariant = new Map<string, { id: string; quantity: number }>();
    for (const it of existingCustomerCart?.items ?? []) {
      existingByVariant.set(it.variantId, { id: it.id, quantity: it.quantity });
    }
    for (const item of anon.items) {
      const match = existingByVariant.get(item.variantId);
      if (match) {
        operations.push({
          kind: "update",
          itemId: match.id,
          quantity: match.quantity + item.quantity,
        });
      } else {
        operations.push({
          kind: "create",
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          currency: item.currency,
        });
      }
    }
  }

  return prisma.$transaction(
    async (tx) => {
      const customerCart =
        existingCustomerCart ??
        (await tx.cart.create({
          data: { customerId: input.customerId, currency: "INR" },
        }));

      // Apply pre-computed write ops.
      for (const op of operations) {
        if (op.kind === "update") {
          await tx.cartItem.update({
            where: { id: op.itemId },
            data: { quantity: op.quantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: customerCart.id,
              variantId: op.variantId,
              quantity: op.quantity,
              unitPriceMinor: op.unitPriceMinor,
              currency: op.currency,
            },
          });
        }
      }

      if (anon) {
        await tx.cart.delete({ where: { id: anon.id } });
      }

      await recomputeTotals(tx, customerCart.id);
      const merged = await tx.cart.findUniqueOrThrow({
        where: { id: customerCart.id },
        include: cartInclude,
      });
      return toView(merged);
    },
    { timeout: 15_000, maxWait: 5_000 },
  );
}

async function recomputeTotals(
  tx: Prisma.TransactionClient,
  cartId: string,
): Promise<void> {
  const cart = await tx.cart.findUniqueOrThrow({
    where: { id: cartId },
    select: {
      couponCode: true,
      shippingMinor: true,
      currency: true,
    },
  });
  const items = await tx.cartItem.findMany({ where: { cartId } });
  const subtotal = items.reduce(
    (sum, i) => sum + i.unitPriceMinor * BigInt(i.quantity),
    0n,
  );

  let discount = 0n;
  let shippingDiscount = 0n;
  let appliedCode: string | null = cart.couponCode;

  if (cart.couponCode) {
    const couponRow = await tx.coupon.findUnique({
      where: { code: cart.couponCode },
    });
    if (couponRow && couponRow.deletedAt == null) {
      const input = couponRowToInput(couponRow);
      const validation = validateCoupon(input, {
        subtotalMinor: subtotal,
        shippingMinor: cart.shippingMinor,
        currency: cart.currency,
      });
      if (validation.ok) {
        const r = applyCoupon(input, {
          subtotalMinor: subtotal,
          shippingMinor: cart.shippingMinor,
          currency: cart.currency,
        });
        discount = r.discountMinor;
        shippingDiscount = r.shippingDiscountMinor;
      } else {
        // Coupon went invalid since application (e.g. subtotal dropped below
        // min). Auto-remove rather than silently overcharging.
        appliedCode = null;
      }
    } else {
      appliedCode = null;
    }
  }

  const total = subtotal + cart.shippingMinor - discount - shippingDiscount;
  const clampedTotal = total < 0n ? 0n : total;

  await tx.cart.update({
    where: { id: cartId },
    data: {
      subtotalMinor: subtotal,
      discountMinor: discount,
      // shippingMinor is computed at checkout; we don't write a negative
      // shipping for FREE_SHIPPING here — we just store discount on top.
      totalMinor: clampedTotal,
      couponCode: appliedCode,
      version: { increment: 1 },
    },
  });
}

function couponRowToInput(row: {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  currency: string | null;
  active: boolean;
  validFrom: Date | null;
  validTo: Date | null;
  minSubtotalMinor: bigint | null;
  maxRedemptions: number | null;
  redemptionsCount: number;
  perCustomerLimit: number | null;
}): CouponInput {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    currency: row.currency,
    active: row.active,
    validFrom: row.validFrom,
    validTo: row.validTo,
    minSubtotalMinor: row.minSubtotalMinor,
    maxRedemptions: row.maxRedemptions,
    redemptionsCount: row.redemptionsCount,
    perCustomerLimit: row.perCustomerLimit,
  };
}

/**
 * Try to apply a coupon code to the cart. Returns a friendly validation
 * result for the UI to show; does not throw on invalid codes.
 */
export async function applyCartCoupon(input: {
  cartId: string;
  code: string;
  customerId?: string | null;
}): Promise<
  | { ok: true; cart: CartView }
  | { ok: false; error: string }
> {
  const code = normalizeCode(input.code);
  if (!code) return { ok: false, error: "Enter a code" };

  const cart = await prisma.cart.findUniqueOrThrow({
    where: { id: input.cartId },
    select: {
      id: true,
      currency: true,
      shippingMinor: true,
      subtotalMinor: true,
    },
  });

  const couponRow = await prisma.coupon.findUnique({ where: { code } });
  if (!couponRow || couponRow.deletedAt != null) {
    return { ok: false, error: "That code isn't recognised" };
  }

  // Compute per-customer redemptions if we have a customer.
  let customerRedemptionCount = 0;
  if (input.customerId) {
    customerRedemptionCount = await prisma.couponRedemption.count({
      where: { couponId: couponRow.id, customerId: input.customerId },
    });
  }

  const couponInput: CouponInput = {
    ...couponRowToInput(couponRow),
    customerRedemptionCount,
  };

  const validation: CouponValidation = validateCoupon(couponInput, {
    subtotalMinor: cart.subtotalMinor,
    shippingMinor: cart.shippingMinor,
    currency: cart.currency,
  });
  if (!validation.ok) {
    return { ok: false, error: validation.message };
  }

  await prisma.$transaction(async (tx) => {
    await tx.cart.update({
      where: { id: cart.id },
      data: { couponCode: code },
    });
    await recomputeTotals(tx, cart.id);
  });

  const updated = await prisma.cart.findUniqueOrThrow({
    where: { id: cart.id },
    include: cartInclude,
  });
  return { ok: true, cart: toView(updated) };
}

export async function removeCartCoupon(cartId: string): Promise<CartView> {
  await prisma.$transaction(async (tx) => {
    await tx.cart.update({
      where: { id: cartId },
      data: { couponCode: null },
    });
    await recomputeTotals(tx, cartId);
  });
  const updated = await prisma.cart.findUniqueOrThrow({
    where: { id: cartId },
    include: cartInclude,
  });
  return toView(updated);
}
