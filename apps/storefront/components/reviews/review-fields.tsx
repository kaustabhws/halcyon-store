"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StarRatingInput } from "@/components/ui/star-rating-input";
import type { ReviewFormState } from "@/lib/review-actions";

/**
 * The shared rating/title/body inputs for a review, used by both the inline
 * PDP form and the account review modal. Stateless — the parent owns the
 * <form>, the action, and the productId hidden field.
 */
export function ReviewFields({
  state,
  defaultValues,
}: {
  state: ReviewFormState | undefined;
  defaultValues?: { rating?: number; title?: string | null; body?: string };
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Your rating</Label>
        <StarRatingInput
          name="rating"
          required
          defaultValue={defaultValues?.rating ?? 0}
        />
        {state?.fieldErrors?.rating ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.rating[0]}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="title">Headline (optional)</Label>
        <Input
          id="title"
          name="title"
          placeholder="A quick summary of your experience"
          maxLength={120}
          defaultValue={defaultValues?.title ?? ""}
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
          defaultValue={defaultValues?.body ?? ""}
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
    </div>
  );
}
