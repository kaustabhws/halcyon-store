"use client";

import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleFeaturedAction } from "@/lib/featured-actions";

export function FeaturedToggle({
  productId,
  isFeatured,
}: {
  productId: string;
  isFeatured: boolean;
}) {
  const [optimistic, setOptimistic] = React.useState(isFeatured);
  const [pending, startTransition] = React.useTransition();

  function toggle() {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      fd.set("featured", String(next));
      const res = await toggleFeaturedAction(fd);
      if (!res.ok) {
        setOptimistic(!next);
        toast.error(res.error);
      }
    });
  }

  return (
    <Switch
      checked={optimistic}
      onCheckedChange={toggle}
      disabled={pending}
      aria-label="Toggle featured"
    />
  );
}
