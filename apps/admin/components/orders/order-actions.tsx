"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { refundOrderAction, updateOrderStatusAction } from "@/lib/order-actions";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export function OrderActions({
  orderId,
  currentStatus,
  refundable,
}: {
  orderId: string;
  currentStatus: string;
  refundable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function setStatus(status: (typeof STATUSES)[number]) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("orderId", orderId);
      fd.set("status", status);
      const res = await updateOrderStatusAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(`Order marked ${status}`);
        router.refresh();
      }
    });
  }

  function refund() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("orderId", orderId);
      const res = await refundOrderAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Refund initiated");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.filter((s) => s !== currentStatus).map((s) => (
        <Button
          key={s}
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setStatus(s)}
        >
          Mark {s}
        </Button>
      ))}
      {refundable ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm" disabled={pending}>
              Refund
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Issue a full refund?</AlertDialogTitle>
              <AlertDialogDescription>
                This refunds the full order amount to the customer&rsquo;s original
                payment method and marks the order as refunded. This can&rsquo;t be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={refund}
                disabled={pending}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {pending ? "Refunding…" : "Issue refund"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
