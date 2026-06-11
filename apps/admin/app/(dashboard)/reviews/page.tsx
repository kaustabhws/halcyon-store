import Link from "next/link";
import { Star } from "lucide-react";
import { reviewRepo } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReviewModerationActions } from "@/components/reviews/moderation-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

const TABS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SPAM", label: "Spam" },
] as const;

type Status = (typeof TABS)[number]["value"];

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.value === sp.status)?.value ??
    "PENDING") as Status;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const { items, totalCount, pageSize, pending } =
    await reviewRepo.listReviewsForAdmin({ status: tab, page, pageSize: 20 });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6 p-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Engagement
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
          {pending > 0 ? (
            <Badge variant="warning" className="text-xs">
              {pending} pending
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Customer reviews wait here until you approve them.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1">
        {TABS.map((t) => {
          const active = t.value === tab;
          return (
            <Link
              key={t.value}
              href={`/reviews?status=${t.value}`}
              className={cn(
                "rounded-full px-4 py-2 text-sm",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Card className="py-0">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No reviews in this state.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((r) => (
                <li key={r.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Stars value={r.rating} />
                        <Badge
                          variant={
                            r.status === "APPROVED"
                              ? "success"
                              : r.status === "REJECTED"
                                ? "danger"
                                : r.status === "SPAM"
                                  ? "danger"
                                  : "warning"
                          }
                        >
                          {r.status}
                        </Badge>
                        {r.hasPendingEdit ? (
                          <Badge variant="accent">Edited — re-review</Badge>
                        ) : null}
                        {r.verifiedPurchase ? (
                          <Badge variant="outline">Verified buyer</Badge>
                        ) : null}
                      </div>

                      {r.hasPendingEdit && r.published ? (
                        // Before/after: what the customer changed since their
                        // last approved version. Approving replaces the public
                        // snapshot with the proposed edit.
                        <div className="mt-1 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg border border-dashed bg-muted/40 p-3">
                            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                              Previously approved
                            </p>
                            <div className="mt-1.5">
                              <Stars value={r.published.rating} />
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
                          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                            <p className="text-[11px] font-medium uppercase tracking-widest text-amber-700 dark:text-amber-400">
                              Proposed edit
                            </p>
                            <div className="mt-1.5">
                              <Stars value={r.rating} />
                            </div>
                            {r.title ? (
                              <p className="mt-1 text-sm font-medium">
                                {r.title}
                              </p>
                            ) : null}
                            <p className="mt-0.5 text-sm leading-relaxed text-foreground/85">
                              {r.body}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {r.title ? (
                            <p className="text-sm font-medium">{r.title}</p>
                          ) : null}
                          <p className="text-sm leading-relaxed text-foreground/85">
                            {r.body}
                          </p>
                        </>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {r.customerName} ·{" "}
                        <Link
                          href={`/products?q=${encodeURIComponent(r.productName)}`}
                          className="hover:underline"
                        >
                          {r.productName}
                        </Link>{" "}
                        ·{" "}
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <ReviewModerationActions
                      reviewId={r.id}
                      status={r.status as Status}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <PagerLink
              href={
                page > 1 ? `/reviews?status=${tab}&page=${page - 1}` : null
              }
              label="Previous"
            />
            <PagerLink
              href={
                page < totalPages
                  ? `/reviews?status=${tab}&page=${page + 1}`
                  : null
              }
              label="Next"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= value
              ? "fill-amber-500 stroke-amber-500"
              : "fill-transparent stroke-muted-foreground/40",
          )}
        />
      ))}
      <span className="ml-1 text-xs tabular-nums text-muted-foreground">
        {value}.0
      </span>
    </span>
  );
}

function PagerLink({ href, label }: { href: string | null; label: string }) {
  return (
    <Link
      href={href ?? "#"}
      aria-disabled={!href}
      className={cn(
        "rounded-md border px-3 py-1.5",
        href ? "hover:bg-muted" : "pointer-events-none opacity-40",
      )}
    >
      {label}
    </Link>
  );
}
