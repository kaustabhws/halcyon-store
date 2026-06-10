"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Trash2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  moderateReviewAction,
  deleteReviewAction,
} from "@/lib/review-actions";

export function ReviewModerationActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SPAM";
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function moderate(next: "APPROVED" | "REJECTED" | "SPAM") {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("reviewId", reviewId);
      fd.set("status", next);
      const res = await moderateReviewAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(`Marked ${next.toLowerCase()}`);
        router.refresh();
      }
    });
  }

  function destroy() {
    if (!confirm("Permanently hide this review?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("reviewId", reviewId);
      const res = await deleteReviewAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Deleted");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== "APPROVED" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => moderate("APPROVED")}
        >
          <Check /> Approve
        </Button>
      ) : null}
      {status !== "REJECTED" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => moderate("REJECTED")}
        >
          <X /> Reject
        </Button>
      ) : null}
      {status !== "SPAM" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => moderate("SPAM")}
        >
          <Flag /> Spam
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={pending}
        onClick={destroy}
        aria-label="Delete"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
