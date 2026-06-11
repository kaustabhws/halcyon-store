"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReviewFields } from "./review-fields";
import {
  submitReviewAction,
  type ReviewFormState,
} from "@/lib/review-actions";

type Mode =
  | { kind: "anonymous" }
  | { kind: "ineligible"; reason: string }
  | { kind: "eligible" };

export function ReviewForm({
  productId,
  mode,
  defaultValues,
}: {
  productId: string;
  mode: Mode;
  defaultValues?: { rating?: number; title?: string | null; body?: string };
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    ReviewFormState | undefined,
    FormData
  >(submitReviewAction, undefined);

  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Thanks — your review is in moderation.");
      formRef.current?.reset();
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
  }, [state, router]);

  if (mode.kind === "anonymous") {
    return (
      <div className="rounded-2xl border bg-muted/40 p-6 text-sm">
        <p className="font-medium">Sign in to leave a review</p>
        <p className="mt-1 text-muted-foreground">
          We can only accept reviews from customers who&rsquo;ve purchased this
          product.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (mode.kind === "ineligible") {
    return (
      <div className="rounded-2xl border bg-muted/40 p-6 text-sm">
        <p className="font-medium">Reviews are for verified buyers</p>
        <p className="mt-1 text-muted-foreground">{mode.reason}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-2xl border bg-card p-6"
    >
      <input type="hidden" name="productId" value={productId} />
      <ReviewFields state={state} defaultValues={defaultValues} />
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
