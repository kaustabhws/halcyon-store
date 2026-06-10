"use client";

import * as React from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/lib/cart-store";

export function CartPageQty({
  itemId,
  quantity,
  available,
}: {
  itemId: string;
  quantity: number;
  available: number;
}) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const [pending, startTransition] = React.useTransition();

  function setQty(next: number) {
    if (next === quantity) return;
    const clamped = Math.max(0, Math.min(available, next));
    startTransition(async () => {
      const res = await setQuantity(itemId, clamped);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex items-center rounded-full border border-zinc-300 dark:border-zinc-800",
          pending && "opacity-60",
        )}
      >
        <button
          type="button"
          onClick={() => setQty(quantity - 1)}
          className="grid h-9 w-9 place-items-center rounded-l-full hover:bg-muted"
          aria-label="Decrease"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
        <button
          type="button"
          onClick={() => setQty(quantity + 1)}
          disabled={quantity >= available}
          className="grid h-9 w-9 place-items-center rounded-r-full hover:bg-muted disabled:opacity-40"
          aria-label="Increase"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setQty(0)}
        aria-label="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
