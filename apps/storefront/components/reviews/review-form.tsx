"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StarRatingInput } from "@/components/ui/star-rating-input";
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
}: {
  productId: string;
  mode: Mode;
}) {
  const [state, action, pending] = useActionState<
    ReviewFormState | undefined,
    FormData
  >(submitReviewAction, undefined);

  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success("Thanks — your review is in moderation.");
      formRef.current?.reset();
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

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
      <div className="space-y-1.5">
        <Label>Your rating</Label>
        <StarRatingInput name="rating" required />
        {state?.fieldErrors?.rating ? (
          <p className="text-xs text-destructive">{state.fieldErrors.rating[0]}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="title">Headline (optional)</Label>
        <Input
          id="title"
          name="title"
          placeholder="A quick summary of your experience"
          maxLength={120}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Your review</Label>
        <Textarea
          id="body"
          name="body"
          required
          rows={5}
          maxLength={2000}
          placeholder="What did you like? What could be better?"
        />
        {state?.fieldErrors?.body ? (
          <p className="text-xs text-destructive">{state.fieldErrors.body[0]}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Reviews are checked by our team before going live.
          </p>
        )}
      </div>
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
