"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCouponAction } from "@/lib/coupon-actions";

export function DeleteCouponButton({
  couponId,
  code,
}: {
  couponId: string;
  code: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function go() {
    if (!confirm(`Delete coupon "${code}"? Active redemptions are preserved.`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("couponId", couponId);
      const res = await deleteCouponAction(fd);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success(`Deleted ${code}`);
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={go}
      disabled={pending}
      aria-label="Delete"
    >
      <Trash2 />
    </Button>
  );
}
