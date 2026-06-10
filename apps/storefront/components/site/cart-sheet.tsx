"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ShoppingBag, Plus, Minus, Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useCartStore, type CartLine } from "@/lib/cart-store";

export function CartSheet() {
  const [open, setOpen] = React.useState(false);
  const hydrated = useCartStore((s) => s.hydrated);
  const cart = useCartStore((s) => s.cart);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const reconcile = useCartStore((s) => s.reconcile);
  const [pending, startTransition] = React.useTransition();

  // Show 0 until rehydration completes; the SSR markup also renders 0 so the
  // first paint matches exactly. After rehydrate, badge swaps to real count.
  const itemCount = hydrated ? cart.itemCount : 0;

  // Each time the sheet opens, fire a background reconcile so the bag reflects
  // any change made in another tab. Optimistic state stays painted meanwhile.
  React.useEffect(() => {
    if (!open) return;
    void reconcile();
  }, [open, reconcile]);

  function patch(itemId: string, quantity: number) {
    startTransition(async () => {
      const res = await setQuantity(itemId, quantity);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cart" className="relative">
          <ShoppingBag />
          {itemCount > 0 ? (
            <Badge
              variant="accent"
              className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px]"
            >
              {itemCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b px-5 py-4">
          <SheetTitle className="text-base">Your bag</SheetTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!hydrated ? (
            <CartSkeleton />
          ) : cart.items.length === 0 ? (
            <EmptyBag onClose={() => setOpen(false)} />
          ) : (
            <ul className="divide-y">
              {cart.items.map((item) => (
                <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <CartLineRow item={item} pending={pending} onPatch={patch} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {hydrated && cart.items.length > 0 ? (
          <div className="border-t bg-muted/30 px-5 py-4 space-y-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums">
                {formatPrice(cart.subtotalMinor, cart.currency)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Shipping calculated at checkout.
            </p>
            <Separator />
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold">Total</span>
              <span className="text-xl font-semibold tabular-nums">
                {formatPrice(cart.totalMinor, cart.currency)}
              </span>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button asChild size="lg" onClick={() => setOpen(false)}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/cart">View full bag</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CartLineRow({
  item,
  pending,
  onPatch,
}: {
  item: CartLine;
  pending: boolean;
  onPatch: (id: string, qty: number) => void;
}) {
  function bump(delta: number) {
    const next = item.quantity + delta;
    if (next < 0) return;
    if (next > item.available) return;
    onPatch(item.id, next);
  }

  return (
    <div className="flex gap-3">
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/product/${item.productSlug}`}
              className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
            >
              {item.productName}
            </Link>
            {item.attributes.length > 0 ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.attributes.map((a) => `${a.label}: ${a.valueLabel}`).join(" · ")}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums">
            {formatPrice(item.lineTotalMinor, item.currency)}
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div
            className={cn(
              "flex items-center rounded-full border",
              pending && "opacity-60",
            )}
          >
            <button
              type="button"
              onClick={() => bump(-1)}
              className="grid h-8 w-8 place-items-center rounded-l-full hover:bg-muted"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
            <button
              type="button"
              onClick={() => bump(1)}
              disabled={item.quantity >= item.available}
              className="grid h-8 w-8 place-items-center rounded-r-full hover:bg-muted disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onPatch(item.id, 0)}
            disabled={pending}
            aria-label="Remove from bag"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyBag({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-semibold">Your bag is empty</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick something good off the shelf.
      </p>
      <Button asChild className="mt-5" onClick={onClose}>
        <Link href="/shop">Browse the shelf</Link>
      </Button>
    </div>
  );
}

function CartSkeleton() {
  return (
    <ul className="divide-y">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex gap-3 py-4 first:pt-0">
          <div className="aspect-square w-20 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="mt-auto h-7 w-24 animate-pulse rounded-full bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
