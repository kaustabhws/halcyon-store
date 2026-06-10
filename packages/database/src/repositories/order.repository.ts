import { prisma } from "../client.ts";
import type { Prisma } from "@prisma/client";

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
    let couponCode: string | null = null;
    let discountMinor = 0n;
    let appliedCouponId: string | null = null;
    if (cartRead.couponCode) {
      const couponRow = await tx.coupon.findUnique({
        where: { code: cartRead.couponCode },
      });
      if (
        couponRow &&
        couponRow.deletedAt == null &&
        couponRow.active &&
        (couponRow.maxRedemptions == null ||
          couponRow.redemptionsCount < couponRow.maxRedemptions)
      ) {
        if (couponRow.type === "PERCENT") {
          discountMinor =
            (subtotal * BigInt(Math.max(0, Math.min(100, couponRow.value)))) /
            100n;
        } else if (couponRow.type === "FIXED") {
          const requested = BigInt(couponRow.value);
          discountMinor = requested > subtotal ? subtotal : requested;
        }
        couponCode = couponRow.code;
        appliedCouponId = couponRow.id;
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

    // Record coupon redemption + bump counter. Done after the order row
    // exists so the FK is valid.
    if (appliedCouponId && couponCode) {
      await tx.couponRedemption.create({
        data: {
          couponId: appliedCouponId,
          customerId: input.customerId,
          orderId: order.id,
        },
      });
      await tx.coupon.update({
        where: { id: appliedCouponId },
        data: { redemptionsCount: { increment: 1 } },
      });
    }

    // Empty the cart and clear any applied coupon
    await tx.cartItem.deleteMany({ where: { cartId: cartRead.id } });
    await tx.cart.update({
      where: { id: cartRead.id },
      data: {
        subtotalMinor: 0n,
        totalMinor: 0n,
        discountMinor: 0n,
        couponCode: null,
        version: { increment: 1 },
      },
    });

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
