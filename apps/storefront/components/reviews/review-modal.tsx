"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReviewFields } from "./review-fields";
import {
  submitReviewAction,
  type ReviewFormState,
} from "@/lib/review-actions";

export type ReviewModalTarget = {
  productId: string;
  productName: string;
  /** Present when editing an existing review — prefills the fields. */
  existing?: {
    rating: number;
    title: string | null;
    body: string;
  };
};

/**
 * A controlled, reusable review modal. Lives once at the top of a list; the
 * parent sets `target` to open it for a specific product (create or edit) and
 * clears it on close. Submitting uses the same server action as the PDP form,
 * so an edit re-enters moderation. On success we refresh the route in place —
 * no navigation, so the customer stays on /account/reviews.
 */
export function ReviewModal({
  target,
  onClose,
}: {
  target: ReviewModalTarget | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    ReviewFormState | undefined,
    FormData
  >(submitReviewAction, undefined);

  const isEdit = Boolean(target?.existing);

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(
        isEdit
          ? "Edit submitted — it's back in moderation."
          : "Thanks — your review is in moderation.",
      );
      onClose();
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
    // We only want to react to a new action result, not to onClose identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog
      open={target != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit your review" : "Write a review"}
          </DialogTitle>
          <DialogDescription>
            {target?.productName}
            {isEdit
              ? " — your changes go back to our team for approval."
              : null}
          </DialogDescription>
        </DialogHeader>

        {target ? (
          // Remount the form per target so defaultValues/state reset cleanly
          // when switching between products.
          <form
            key={target.productId}
            action={action}
            className="space-y-4"
          >
            <input type="hidden" name="productId" value={target.productId} />
            <ReviewFields
              state={state}
              defaultValues={
                target.existing
                  ? {
                      rating: target.existing.rating,
                      title: target.existing.title,
                      body: target.existing.body,
                    }
                  : undefined
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Submitting…"
                  : isEdit
                    ? "Save changes"
                    : "Submit review"}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
