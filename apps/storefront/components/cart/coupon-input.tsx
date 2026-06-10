"use client";

import * as React from "react";
import { toast } from "sonner";
import { TicketPercent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart-store";

export function CouponInput() {
  const appliedCode = useCartStore((s) => s.cart.couponCode);
  const discountMinor = useCartStore((s) => s.cart.discountMinor);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);

  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const code = value.trim();
    if (!code) return;
    startTransition(async () => {
      const res = await applyCoupon(code);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Discount applied");
      setValue("");
      setOpen(false);
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await removeCoupon();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Discount removed");
    });
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-emerald-500/5 px-4 py-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <TicketPercent className="h-4 w-4 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="truncate font-mono text-xs uppercase tracking-widest">
              {appliedCode}
            </p>
            <p className="text-xs text-muted-foreground">
              {discountMinor > 0n ? "Discount applied" : "Free shipping applied"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={remove}
          disabled={pending}
          aria-label="Remove discount"
        >
          <X />
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 30);
        }}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Have a discount code?
      </button>
    );
  }

  return (
    <form onSubmit={apply} className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Discount code"
        className="h-9 flex-1"
        autoComplete="off"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Applying…" : "Apply"}
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setValue("");
        }}
        aria-label="Cancel"
      >
        <X />
      </Button>
    </form>
  );
}
