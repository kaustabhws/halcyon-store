"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    if (!confirm("Issue a full refund for this order?")) return;
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
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={refund}
        >
          Refund
        </Button>
      ) : null}
    </div>
  );
}
