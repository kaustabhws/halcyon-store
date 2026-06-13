import { prisma } from "../client.ts";
import type { Prisma } from "@prisma/client";
import {
  validateCoupon,
  applyCoupon,
  couponRowToInput,
} from "@ecom/shared/coupons";

/** Statuses that count as a paid purchase (for firstOrderOnly eligibility). */
const PAID_ORDER_STATUSES = [
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "REFUNDED",
] as const;

const orderInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              media: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 },
              brand: true,
            },
          },
        },
      },
    },
  },
  timeline: { orderBy: { createdAt: "asc" } },
  paymentTransactions: true,
  fulfillments: { include: { shipments: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderRow["status"];
  totalMinor: bigint;
  currency: string;
  placedAt: Date;
  itemCount: number;
};

export type OrderDetail = OrderListItem & {
  items: Array<{
    id: string;
    productSlug: string;
    productName: string;
    variantName: string | null;
    sku: string;
    imageUrl: string | null;
    quantity: number;
    unitPriceMinor: bigint;
    totalMinor: bigint;
    attributes: Array<{
      code: string;
      label: string;
      value: string;
      valueLabel: string;
    }>;
  }>;
  subtotalMinor: bigint;
  discountMinor: bigint;
  shippingMinor: bigint;
  shippingAddress: unknown;
  timeline: Array<{ type: string; message: string | null; createdAt: Date }>;
};

export type AddressSnapshot = {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

/**
 * Build a human-readable order number. Format: ORD-YYYY-NNNNNN.
 * MVP uses count + 1; replace with a Postgres sequence later for safety
 * under high concurrency.
 */
async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const count = await tx.order.count({
    where: {
      placedAt: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    },
  });
  const serial = String(count + 1).padStart(6, "0");
  return `ORD-${year}-${serial}`;
}

export async function createOrderFromCart(input: {
  cartId: string;
  customerId: string;
  vendorId: string;
  shippingAddress: AddressSnapshot;
  billingAddress?: AddressSnapshot;
}): Promise<{ orderId: string; orderNumber: string; totalMinor: bigint; currency: string }> {
  // Pre-fetch the cart with all snapshot data OUTSIDE the transaction. The
  // 5-level include was the dominant cost and was timing out on cold Neon
  // connections. Inside the tx we only do the dynamic re-checks (inventory,
  // coupon counter) plus writes.
  const cartRead = await prisma.cart.findUniqueOrThrow({
    where: { id: input.cartId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  brand: true,
                  media: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
                },
              },
              attributes: { include: { attributeValue: { include: { attribute: true } } } },
            },
          },
        },
      },
    },
  });
  if (cartRead.items.length === 0) throw new Error("cart is empty");

  // Pre-compute item snapshots so the tx only does writes.
  const itemSnapshots = cartRead.items.map((i) => {
    const product = i.variant.product;
    // Pick the image tagged to this variant's value of the product's image
    // attribute (e.g. its Color). Falls back to the primary image.
    let imageUrl = product.media[0]?.url ?? null;
    if (product.useVariantImages && product.imageAttributeId) {
      const vav = i.variant.attributes.find(
        (a) => a.attributeValue.attribute.id === product.imageAttributeId,
      );
      const valueId = vav?.attributeValue.id;
      const tagged = valueId
        ? product.media.find((m) => m.attributeValueId === valueId)
        : undefined;
      imageUrl = tagged?.url ?? product.media[0]?.url ?? null;
    }
    return {
      variantId: i.variantId,
      quantity: i.quantity,
      unitPriceMinor: i.unitPriceMinor,
      totalMinor: i.unitPriceMinor * BigInt(i.quantity),
      productSnapshot: {
        productId: i.variant.product.id,
        slug: i.variant.product.slug,
        name: i.variant.product.name,
        brandName: i.variant.product.brand?.name ?? null,
        imageUrl,
        sku: i.variant.sku,
        variantName: i.variant.name,
        attributes: i.variant.attributes.map((a) => ({
          code: a.attributeValue.attribute.code,
          label: a.attributeValue.attribute.label,
          value: a.attributeValue.value,
          valueLabel: a.attributeValue.label,
        })),
      } as unknown as Prisma.InputJsonValue,
    };
  });

  const subtotal = cartRead.items.reduce(
    (sum, i) => sum + i.unitPriceMinor * BigInt(i.quantity),
    0n,
  );

  return prisma.$transaction(
    async (tx) => {
      // Re-fetch inventory levels fresh inside the tx for accurate stock check.
      const variantIds = cartRead.items.map((i) => i.variantId);
      const inventoryLevels = await tx.inventoryLevel.findMany({
        where: { variantId: { in: variantIds } },
      });
      const levelsByVariant = new Map<string, typeof inventoryLevels>();
      for (const lvl of inventoryLevels) {
        const arr = levelsByVariant.get(lvl.variantId) ?? [];
        arr.push(lvl);
        levelsByVariant.set(lvl.variantId, arr);
      }

      for (const item of cartRead.items) {
        const levels = levelsByVariant.get(item.variantId) ?? [];
        const available = levels.reduce(
          (sum, i) => sum + (i.onHand - i.reserved),
          0,
        );
        if (item.quantity > available) {
          throw new Error(
            `Not enough stock for ${item.variant.product.name}: ${available} available, ${item.quantity} requested`,
          );
        }
      }

    // Re-validate the coupon at order time. The cart already enforces this on
    // every mutation, but races (a coupon hitting maxRedemptions between cart
    // and checkout) are possible. We don't fail the order on coupon issues —
    // we just drop the discount.
    // Re-validate the coupon at order time using the SAME engine the cart uses
    // (validateCoupon), so every rule — dates, min-subtotal, per-customer
    // limit, firstOrderOnly — is enforced here too, not just at cart-apply.
    // Races (a coupon expiring or the customer becoming ineligible between cart
    // and checkout) drop the discount rather than failing the order.
    let couponCode: string | null = null;
    let discountMinor = 0n;
    if (cartRead.couponCode) {
      const couponRow = await tx.coupon.findUnique({
        where: { code: cartRead.couponCode },
      });
      if (couponRow && couponRow.deletedAt == null) {
        const [customerRedemptionCount, priorPaid] = await Promise.all([
          tx.couponRedemption.count({
            where: { couponId: couponRow.id, customerId: input.customerId },
          }),
          tx.order.count({
            where: {
              customerId: input.customerId,
              status: { in: [...PAID_ORDER_STATUSES] },
            },
          }),
        ]);
        const couponInput = {
          ...couponRowToInput(couponRow),
          customerRedemptionCount,
          customerHasPriorPaidOrder: priorPaid > 0,
        };
        const ctx = {
          subtotalMinor: subtotal,
          shippingMinor: 0n,
          currency: cartRead.currency,
        };
        if (validateCoupon(couponInput, ctx).ok) {
          discountMinor = applyCoupon(couponInput, ctx).discountMinor;
          couponCode = couponRow.code;
        }
      }
    }

    const totalAfterDiscount =
      subtotal - discountMinor < 0n ? 0n : subtotal - discountMinor;

    const orderNumber = await nextOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        orderNumber,
        vendorId: input.vendorId,
        customerId: input.customerId,
        currency: cartRead.currency,
        subtotalMinor: subtotal,
        discountMinor,
        couponCode,
        totalMinor: totalAfterDiscount,
        status: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
        billingAddress: (input.billingAddress ?? input.shippingAddress) as unknown as Prisma.InputJsonValue,
        items: { create: itemSnapshots },
        timeline: {
          create: { type: "order.created", message: "Order created", actorKind: "CUSTOMER", actorId: input.customerId },
        },
      },
    });

    // Reserve inventory (15-minute hold for payment)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    for (const item of cartRead.items) {
      const level = (levelsByVariant.get(item.variantId) ?? [])[0];
      if (!level) throw new Error(`no warehouse inventory for variant ${item.variantId}`);
      await tx.inventoryReservation.create({
        data: {
          variantId: item.variantId,
          warehouseId: level.warehouseId,
          quantity: item.quantity,
          orderId: order.id,
          expiresAt,
        },
      });
      await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { reserved: { increment: item.quantity } },
      });
    }

    // Outbox for downstream consumers (search, analytics, email)
    await tx.outboxEvent.create({
      data: {
        aggregateType: "order",
        aggregateId: order.id,
        type: "order.placed",
        payload: { orderId: order.id, orderNumber, totalMinor: totalAfterDiscount.toString() },
      },
    });

    // NOTE: coupon redemption (CouponRedemption row + counter bump) is NOT
    // recorded here. The order is still PENDING (unpaid) — redeeming now would
    // "consume" a coupon use for an order that may never be paid, and would
    // double-count across payment retries. markOrderPaid() records it once, on
    // the PENDING → CONFIRMED transition.

    // NOTE: we deliberately do NOT empty the cart here. This order is still
    // PENDING (unpaid) — clearing the cart now would wipe it the instant the
    // customer cancels or closes the Razorpay modal. The cart is cleared only
    // once payment actually succeeds, on the PENDING → CONFIRMED transition:
    // the mock path (deleteCartRow in checkout-actions), the checkout-verify
    // handshake, and the Razorpay webhook each clear it.

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalMinor: totalAfterDiscount,
      currency: cartRead.currency,
    };
    },
    {
      // Neon serverless cold connections + multiple round-trips can push the
      // tx past the 5s default. 15s is comfortable headroom for India→Neon.
      timeout: 15_000,
      maxWait: 5_000,
    },
  );
}

/** The Razorpay checkout payload stored on a PENDING order's payment intent. */
export type RazorpayClientPayload = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
};

export type OpenRazorpayOrder = {
  orderId: string;
  orderNumber: string;
  totalMinor: bigint;
  currency: string;
  couponCode: string | null;
  items: Array<{ variantId: string; quantity: number }>;
  clientPayload: RazorpayClientPayload;
};

/**
 * The customer's current "open" Razorpay checkout order, if any: a recent
 * (< 15 min) PENDING order whose Razorpay intent is still awaiting payment.
 * Used to reuse the same order + Razorpay handle on a payment retry instead of
 * minting a duplicate order every time the customer reopens the pay modal.
 */
export async function findOpenRazorpayOrder(
  customerId: string,
): Promise<OpenRazorpayOrder | null> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const order = await prisma.order.findFirst({
    where: {
      customerId,
      status: "PENDING",
      createdAt: { gte: cutoff },
      paymentIntents: {
        some: { provider: "RAZORPAY", status: "REQUIRES_ACTION" },
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { variantId: true, quantity: true } },
      paymentIntents: {
        where: { provider: "RAZORPAY", status: "REQUIRES_ACTION" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!order) return null;

  const intent = order.paymentIntents[0];
  const payload = intent?.clientPayload as RazorpayClientPayload | null;
  if (!payload || !payload.razorpayOrderId) return null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalMinor: order.totalMinor,
    currency: order.currency,
    couponCode: order.couponCode,
    items: order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    clientPayload: payload,
  };
}

/**
 * Cancel an open (PENDING) checkout order and release its inventory holds.
 * Mirrors the release-reservations cron, but runs immediately when the cart
 * has changed so we don't leave a stale order + double-held stock behind.
 * No-op if the order isn't PENDING anymore (e.g. just got paid).
 */
export async function cancelCheckoutOrder(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order || order.status !== "PENDING") return;

    const reservations = await tx.inventoryReservation.findMany({
      where: { orderId, releasedAt: null },
    });
    const now = new Date();
    for (const r of reservations) {
      const level = await tx.inventoryLevel.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: r.warehouseId,
            variantId: r.variantId,
          },
        },
      });
      if (level && level.reserved > 0) {
        await tx.inventoryLevel.update({
          where: { id: level.id },
          data: {
            reserved: Math.max(0, level.reserved - r.quantity),
            version: { increment: 1 },
          },
        });
      }
      await tx.inventoryReservation.update({
        where: { id: r.id },
        data: { releasedAt: now },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    await tx.orderTimelineEvent.create({
      data: {
        orderId: order.id,
        type: "order.cancelled",
        message: "Superseded by a new checkout (cart changed)",
        actorKind: "SYSTEM",
      },
    });
    await tx.paymentIntent.updateMany({
      where: { orderId: order.id, status: { in: ["REQUIRES_ACTION", "PROCESSING"] } },
      data: { status: "FAILED" },
    });
  });
}

/**
 * Mark an order paid: the single source of truth for the PENDING → CONFIRMED
 * transition. Idempotent (atomic claim via updateMany), so the mock path, the
 * checkout-verify handshake, and the Razorpay webhook can all call it safely
 * — only the first caller does the work. Records the coupon redemption once
 * and clears the customer's cart.
 *
 * Payment-record writes (PaymentIntent / PaymentTransaction) stay with each
 * caller; this owns only the order-level effects.
 */
export async function markOrderPaid(input: {
  orderId: string;
  actor?: { kind: "CUSTOMER" | "ADMIN" | "SYSTEM"; id?: string };
  message?: string;
}): Promise<{ confirmed: boolean }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      select: { id: true, customerId: true, couponCode: true },
    });
    if (!order) throw new Error("Order not found");

    // Atomically claim the transition. Only one concurrent caller gets count 1.
    const claim = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "CONFIRMED" },
    });
    if (claim.count === 0) return { confirmed: false };

    await tx.orderTimelineEvent.create({
      data: {
        orderId: order.id,
        type: "payment.captured",
        message: input.message ?? "Payment captured",
        actorKind: input.actor?.kind ?? "SYSTEM",
        actorId: input.actor?.id ?? null,
      },
    });

    // Record the coupon redemption now that the order is actually paid. The
    // claim above guarantees this runs once per order, so the unique
    // (couponId, orderId) constraint is never tripped.
    if (order.couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { code: order.couponCode },
        select: { id: true },
      });
      if (coupon) {
        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            customerId: order.customerId,
            orderId: order.id,
          },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { redemptionsCount: { increment: 1 } },
        });
      }
    }

    // Payment succeeded — clear the cart (was intentionally kept until now).
    await tx.cart.deleteMany({ where: { customerId: order.customerId } });

    return { confirmed: true };
  });
}

export async function listOrdersForCustomer(
  customerId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<{ items: OrderListItem[]; totalCount: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 10));

  const [rows, totalCount] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: true },
    }),
    prisma.order.count({ where: { customerId } }),
  ]);

  const items: OrderListItem[] = rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    totalMinor: o.totalMinor,
    currency: o.currency,
    placedAt: o.placedAt,
    itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
  }));

  return { items, totalCount, page, pageSize };
}

export async function getOrderDetail(
  orderId: string,
  forCustomerId?: string,
): Promise<OrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, ...(forCustomerId ? { customerId: forCustomerId } : {}) },
    include: orderInclude,
  });
  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalMinor: order.totalMinor,
    subtotalMinor: order.subtotalMinor,
    discountMinor: order.discountMinor,
    shippingMinor: order.shippingMinor,
    currency: order.currency,
    placedAt: order.placedAt,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    shippingAddress: order.shippingAddress,
    items: order.items.map((i) => {
      const snap = i.productSnapshot as {
        slug: string;
        name: string;
        imageUrl: string | null;
        sku: string;
        variantName: string | null;
        attributes?: Array<{
          code: string;
          label: string;
          value: string;
          valueLabel: string;
        }>;
      };
      return {
        id: i.id,
        productSlug: snap.slug,
        productName: snap.name,
        variantName: snap.variantName,
        sku: snap.sku,
        imageUrl: snap.imageUrl,
        quantity: i.quantity,
        unitPriceMinor: i.unitPriceMinor,
        totalMinor: i.totalMinor,
        attributes: snap.attributes ?? [],
      };
    }),
    timeline: order.timeline.map((t) => ({
      type: t.type,
      message: t.message,
      createdAt: t.createdAt,
    })),
  };
}
