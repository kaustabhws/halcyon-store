"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import {
  ReviewModal,
  type ReviewModalTarget,
} from "@/components/reviews/review-modal";

type ToReviewItem = {
  productId: string;
  productName: string;
  productSlug: string;
  primaryImageUrl: string | null;
  purchasedAt: string;
};

type MyReview = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  status: string;
  rating: number;
  title: string | null;
  body: string;
  hasPendingEdit: boolean;
  updatedAt: string;
  published: {
    rating: number;
    title: string | null;
    body: string;
    publishedAt: string;
  } | null;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

/** Status chip — captures the snapshot-vs-working-copy lifecycle in one label. */
function statusChip(r: MyReview): {
  label: string;
  variant: "default" | "success" | "danger" | "outline" | "warning";
} {
  if (r.hasPendingEdit) return { label: "Edit in review", variant: "warning" };
  switch (r.status) {
    case "APPROVED":
      return { label: "Published", variant: "success" };
    case "PENDING":
      return { label: "In review", variant: "warning" };
    case "REJECTED":
      return { label: "Not approved", variant: "danger" };
    case "SPAM":
      return { label: "Not approved", variant: "danger" };
    default:
      return { label: r.status, variant: "outline" };
  }
}

export function AccountReviews({
  toReview,
  mine,
}: {
  toReview: ToReviewItem[];
  mine: MyReview[];
}) {
  const [target, setTarget] = React.useState<ReviewModalTarget | null>(null);

  return (
    <div className="space-y-12">
      {/* To review */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl tracking-tight">
            Waiting for your review
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Products you&rsquo;ve bought but haven&rsquo;t reviewed yet.
          </p>
        </div>

        {toReview.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            Nothing waiting — you&rsquo;ve reviewed everything you bought.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {toReview.map((t) => (
              <li
                key={t.productId}
                className="flex items-center gap-4 rounded-2xl border bg-card p-4"
              >
                <Link
                  href={`/product/${t.productSlug}`}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  {t.primaryImageUrl ? (
                    <Image
                      src={t.primaryImageUrl}
                      alt={t.productName}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${t.productSlug}`}
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {t.productName}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Purchased {fmtDate(t.purchasedAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    setTarget({
                      productId: t.productId,
                      productName: t.productName,
                    })
                  }
                >
                  Write a review
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Your reviews */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Your reviews</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit any review — changes go back to our team before they&rsquo;re
            published.
          </p>
        </div>

        {mine.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            You haven&rsquo;t written any reviews yet.
          </div>
        ) : (
          <ul className="space-y-4">
            {mine.map((r) => {
              const chip = statusChip(r);
              return (
                <li
                  key={r.id}
                  className="space-y-3 rounded-2xl border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StarRating value={r.rating} size="sm" />
                        <Badge variant={chip.variant}>{chip.label}</Badge>
                      </div>
                      <Link
                        href={`/product/${r.productSlug}`}
                        className="block text-sm font-medium hover:underline"
                      >
                        {r.productName}
                      </Link>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setTarget({
                          productId: r.productId,
                          productName: r.productName,
                          existing: {
                            rating: r.rating,
                            title: r.title,
                            body: r.body,
                          },
                        })
                      }
                    >
                      Edit
                    </Button>
                  </div>

                  {/* Working copy (latest, what the customer last wrote) */}
                  <div className="space-y-1">
                    {r.title ? (
                      <p className="text-sm font-medium">{r.title}</p>
                    ) : null}
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {r.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last updated {fmtDate(r.updatedAt)}
                    </p>
                  </div>

                  {/* If an edit is awaiting approval, show what's still live */}
                  {r.hasPendingEdit && r.published ? (
                    <div className="rounded-xl border border-dashed bg-muted/40 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                        Currently shown publicly (your last approved version)
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <StarRating value={r.published.rating} size="xs" />
                      </div>
                      {r.published.title ? (
                        <p className="mt-1 text-sm font-medium">
                          {r.published.title}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-sm leading-relaxed text-foreground/70">
                        {r.published.body}
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ReviewModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
