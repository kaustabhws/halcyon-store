import { prisma } from "../client.ts";
import type { Prisma } from "@prisma/client";

const reviewInclude = {
  customer: { select: { firstName: true, lastName: true, email: true } },
  product: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ReviewInclude;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

export type ReviewView = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  customerId: string;
  customerName: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewRow["status"];
  helpfulCount: number;
  verifiedPurchase: boolean;
  createdAt: Date;
};

function customerLabel(c: ReviewRow["customer"]): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  // Mask emails so we don't leak private info on a public PDP.
  const local = c.email.split("@")[0] ?? "Customer";
  return local.length <= 2 ? "Customer" : `${local.slice(0, 2)}***`;
}

function toView(r: ReviewRow): ReviewView {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.product.name,
    productSlug: r.product.slug,
    customerId: r.customerId,
    customerName: customerLabel(r.customer),
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    helpfulCount: r.helpfulCount,
    verifiedPurchase: Boolean(r.orderItemId),
    createdAt: r.createdAt,
  };
}

/**
 * Public reviews on a PDP. Only approved, soft-delete-respecting rows.
 */
export async function listProductReviews(
  productId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<{
  items: ReviewView[];
  totalCount: number;
  page: number;
  pageSize: number;
  averageRating: number | null;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(20, Math.max(1, opts.pageSize ?? 10));

  const where: Prisma.ReviewWhereInput = {
    productId,
    status: "APPROVED",
    deletedAt: null,
  };

  const [rows, totalCount, agg] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: reviewInclude,
    }),
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      select: { rating: true },
    }),
  ]);

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  };
  let sum = 0;
  for (const r of agg) {
    sum += r.rating;
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
    }
  }
  const averageRating = agg.length > 0 ? sum / agg.length : null;

  return {
    items: rows.map(toView),
    totalCount,
    page,
    pageSize,
    averageRating,
    ratingDistribution: distribution,
  };
}

/**
 * Order items that this customer has purchased and not yet reviewed. Powers
 * the "Leave a review" surface in /account/orders.
 */
export async function listReviewableItemsForCustomer(
  customerId: string,
  limit = 20,
): Promise<
  Array<{
    orderItemId: string;
    orderId: string;
    orderNumber: string;
    productId: string;
    productName: string;
    productSlug: string;
    primaryImageUrl: string | null;
    purchasedAt: Date;
  }>
> {
  // Items from delivered or confirmed orders that don't already have a
  // review by this customer.
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        customerId,
        status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      // No review yet that references this orderItem
      variant: {
        product: {
          reviews: { none: { customerId, deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      order: { select: { id: true, orderNumber: true, placedAt: true } },
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              media: {
                where: { variantId: null },
                take: 1,
                orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
                select: { url: true },
              },
            },
          },
        },
      },
    },
  });

  return items.map((it) => ({
    orderItemId: it.id,
    orderId: it.order.id,
    orderNumber: it.order.orderNumber,
    productId: it.variant.product.id,
    productName: it.variant.product.name,
    productSlug: it.variant.product.slug,
    primaryImageUrl: it.variant.product.media[0]?.url ?? null,
    purchasedAt: it.order.placedAt,
  }));
}

/**
 * Admin queue: any review status. Filterable by status for the moderation UI.
 */
export async function listReviewsForAdmin(opts: {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "SPAM";
  page?: number;
  pageSize?: number;
}): Promise<{
  items: ReviewView[];
  totalCount: number;
  page: number;
  pageSize: number;
  pending: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));

  const where: Prisma.ReviewWhereInput = {
    deletedAt: null,
    ...(opts.status ? { status: opts.status } : {}),
  };

  const [rows, totalCount, pending] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: reviewInclude,
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: "PENDING", deletedAt: null } }),
  ]);

  return {
    items: rows.map(toView),
    totalCount,
    page,
    pageSize,
    pending,
  };
}

export async function getReviewById(id: string): Promise<ReviewView | null> {
  const r = await prisma.review.findUnique({
    where: { id },
    include: reviewInclude,
  });
  return r ? toView(r) : null;
}
