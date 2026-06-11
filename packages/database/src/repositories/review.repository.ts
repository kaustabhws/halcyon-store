import { prisma } from "../client.ts";
import type { Prisma } from "@prisma/client";

const reviewInclude = {
  customer: { select: { firstName: true, lastName: true, email: true } },
  product: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ReviewInclude;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

/** The last admin-approved version of a review, shown publicly. */
export type PublishedSnapshot = {
  rating: number;
  title: string | null;
  body: string;
  publishedAt: Date;
};

export type ReviewView = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  customerId: string;
  customerName: string;
  /** Working copy — the customer's latest submitted version. */
  rating: number;
  title: string | null;
  body: string;
  status: ReviewRow["status"];
  helpfulCount: number;
  verifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Last approved version, or null if never approved. */
  published: PublishedSnapshot | null;
  /**
   * True when an already-published review has unapproved edits sitting in
   * moderation (working copy differs and status is back to PENDING).
   */
  hasPendingEdit: boolean;
};

function customerLabel(c: ReviewRow["customer"]): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  // Mask emails so we don't leak private info on a public PDP.
  const local = c.email.split("@")[0] ?? "Customer";
  return local.length <= 2 ? "Customer" : `${local.slice(0, 2)}***`;
}

function publishedOf(r: ReviewRow): PublishedSnapshot | null {
  if (!r.publishedAt || r.publishedRating == null || r.publishedBody == null) {
    return null;
  }
  return {
    rating: r.publishedRating,
    title: r.publishedTitle,
    body: r.publishedBody,
    publishedAt: r.publishedAt,
  };
}

function toView(r: ReviewRow): ReviewView {
  const published = publishedOf(r);
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
    updatedAt: r.updatedAt,
    published,
    hasPendingEdit:
      published != null &&
      r.status !== "APPROVED" &&
      (r.rating !== published.rating ||
        r.title !== published.title ||
        r.body !== published.body),
  };
}

/**
 * A single public-facing review on a PDP — always the published snapshot, so
 * an in-moderation edit never changes or hides what shoppers already saw.
 */
export type PublicReview = {
  id: string;
  customerName: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  publishedAt: Date;
};

/**
 * Public reviews on a PDP. Anything that has ever been approved (publishedAt
 * set) and is not soft-deleted shows its last-approved snapshot — even if the
 * customer has a newer edit awaiting re-moderation.
 */
export async function listProductReviews(
  productId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<{
  items: PublicReview[];
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
    publishedAt: { not: null },
    deletedAt: null,
  };

  const [rows, totalCount, agg] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ helpfulCount: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: reviewInclude,
    }),
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      select: { publishedRating: true },
    }),
  ]);

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  };
  let sum = 0;
  let counted = 0;
  for (const r of agg) {
    const rating = r.publishedRating;
    if (rating == null) continue;
    sum += rating;
    counted += 1;
    if (rating >= 1 && rating <= 5) {
      distribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
    }
  }
  const averageRating = counted > 0 ? sum / counted : null;

  const items: PublicReview[] = rows.map((r) => {
    const pub = publishedOf(r)!;
    return {
      id: r.id,
      customerName: customerLabel(r.customer),
      rating: pub.rating,
      title: pub.title,
      body: pub.body,
      verifiedPurchase: Boolean(r.orderItemId),
      publishedAt: pub.publishedAt,
    };
  });

  return {
    items,
    totalCount,
    page,
    pageSize,
    averageRating,
    ratingDistribution: distribution,
  };
}

/**
 * Every review this customer has written (any status, excluding hard-hidden
 * soft-deletes). Powers the "Your reviews" list in /account/reviews — shows the
 * working copy, current status, and (if any) the published snapshot.
 */
export async function listCustomerReviews(
  customerId: string,
): Promise<ReviewView[]> {
  const rows = await prisma.review.findMany({
    where: { customerId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: reviewInclude,
  });
  return rows.map(toView);
}

/**
 * Order items that this customer has purchased and not yet reviewed. Powers
 * the "Leave a review" surface in /account/orders and /account/reviews.
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

  // De-dupe by product — a customer can buy the same product across multiple
  // orders, but we only want one "write a review" prompt per product.
  const seen = new Set<string>();
  const out: Array<{
    orderItemId: string;
    orderId: string;
    orderNumber: string;
    productId: string;
    productName: string;
    productSlug: string;
    primaryImageUrl: string | null;
    purchasedAt: Date;
  }> = [];
  for (const it of items) {
    const productId = it.variant.product.id;
    if (seen.has(productId)) continue;
    seen.add(productId);
    out.push({
      orderItemId: it.id,
      orderId: it.order.id,
      orderNumber: it.order.orderNumber,
      productId,
      productName: it.variant.product.name,
      productSlug: it.variant.product.slug,
      primaryImageUrl: it.variant.product.media[0]?.url ?? null,
      purchasedAt: it.order.placedAt,
    });
  }
  return out;
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
