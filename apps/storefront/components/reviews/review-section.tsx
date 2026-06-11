import { auth } from "@/lib/auth";
import { prisma, reviewRepo } from "@/lib/db";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewForm } from "./review-form";

/**
 * Server-rendered review section: aggregates, distribution bar, paginated
 * list, and the inline review form (when the customer is eligible).
 */
export async function ReviewSection({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const session = await auth();
  const customerId = session?.user?.id ?? null;

  const [reviews, eligibility] = await Promise.all([
    reviewRepo.listProductReviews(productId, { pageSize: 6 }),
    customerId ? checkEligibility(customerId, productId) : Promise.resolve(null),
  ]);

  const formMode = !customerId
    ? ({ kind: "anonymous" } as const)
    : eligibility?.eligible
      ? ({ kind: "eligible" } as const)
      : ({
          kind: "ineligible",
          reason:
            eligibility?.reason ??
            "We can only accept reviews from customers who've purchased this product.",
        } as const);

  const dist = reviews.ratingDistribution;
  const total =
    dist[1] + dist[2] + dist[3] + dist[4] + dist[5] || 1;

  return (
    <section
      id="reviews"
      className="mt-20 grid gap-12 scroll-mt-20 md:grid-cols-[1fr_2fr]"
    >
      <div>
        <h2 className="font-display text-3xl tracking-tight md:text-4xl">
          Reviews
        </h2>
        {reviews.totalCount > 0 ? (
          <div className="mt-5 space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-5xl">
                {reviews.averageRating?.toFixed(1) ?? "—"}
              </span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
            <StarRating
              value={reviews.averageRating ?? 0}
              size="md"
            />
            <p className="text-sm text-muted-foreground">
              {reviews.totalCount}{" "}
              {reviews.totalCount === 1 ? "review" : "reviews"}
            </p>
            <div className="mt-4 space-y-1.5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = dist[star];
                const pct = (count / total) * 100;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-4 tabular-nums text-muted-foreground">
                      {star}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No reviews yet. Be the first.
          </p>
        )}
      </div>

      <div className="space-y-6">
        <ReviewForm productId={productId} mode={formMode} />

        {reviews.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Real reviews from {productName} customers will show here.
          </div>
        ) : (
          <ul className="space-y-5">
            {reviews.items.map((r) => (
              <li
                key={r.id}
                className="space-y-2 rounded-2xl border bg-card p-5"
              >
                <div className="flex items-center gap-3">
                  <StarRating value={r.rating} size="sm" />
                  {r.verifiedPurchase ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                      Verified buyer
                    </span>
                  ) : null}
                </div>
                {r.title ? (
                  <p className="text-sm font-medium">{r.title}</p>
                ) : null}
                <p className="text-sm leading-relaxed text-foreground/80">
                  {r.body}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.customerName} ·{" "}
                  {new Date(r.publishedAt).toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

async function checkEligibility(
  customerId: string,
  productId: string,
): Promise<{ eligible: boolean; reason?: string }> {
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      order: {
        customerId,
        status: { notIn: ["FAILED", "CANCELLED"] },
      },
      variant: { productId },
    },
    select: { id: true },
  });
  if (!orderItem) {
    return {
      eligible: false,
      reason:
        "We can only accept reviews from customers who've purchased this product.",
    };
  }
  return { eligible: true };
}
