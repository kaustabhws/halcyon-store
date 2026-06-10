"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CartPageQty } from "@/components/cart/cart-page-qty";
import { CouponInput } from "@/components/cart/coupon-input";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";

export function CartPageClient() {
  const hydrated = useCartStore((s) => s.hydrated);
  const cart = useCartStore((s) => s.cart);
  const reconcile = useCartStore((s) => s.reconcile);

  React.useEffect(() => {
    if (hydrated) void reconcile();
  }, [hydrated, reconcile]);

  if (!hydrated) {
    return <CartPageSkeleton />;
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Your bag is empty</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Nothing here yet. Pick something good off the shelf.
        </p>
        <Button asChild className="mt-8">
          <Link href="/shop">Browse the shelf</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page py-12 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Your bag</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[2fr_1fr]">
        <ul className="space-y-6">
          {cart.items.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-2xl border border-zinc-200 bg-background p-4 dark:border-zinc-900"
            >
              <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {item.brandName ? (
                      <p className="text-[11px] uppercase tracking-widest text-zinc-500">
                        {item.brandName}
                      </p>
                    ) : null}
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {item.productName}
                    </Link>
                    {item.attributes.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.attributes.map((a) => (
                          <span
                            key={a.code}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-1.5 py-0.5 text-[11px] dark:border-zinc-800"
                          >
                            {a.swatchHex ? (
                              <span
                                className="h-3 w-3 rounded-full border border-zinc-200 dark:border-zinc-700"
                                style={{ background: a.swatchHex }}
                              />
                            ) : null}
                            <span className="text-zinc-500">{a.label}:</span>
                            <span>{a.valueLabel}</span>
                          </span>
                        ))}
                      </div>
                    ) : item.variantName ? (
                      <p className="mt-0.5 text-xs text-zinc-500">{item.variantName}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">
                      {formatPrice(item.lineTotalMinor, item.currency)}
                    </div>
                    {item.quantity > 1 ? (
                      <div className="text-xs text-zinc-500">
                        {formatPrice(item.unitPriceMinor, item.currency)} each
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-auto pt-3">
                  <CartPageQty itemId={item.id} quantity={item.quantity} available={item.available} />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border bg-background p-6">
          <h2 className="text-lg font-semibold tracking-tight">Summary</h2>
          <dl className="mt-5 space-y-2 text-sm">
            <Row label="Subtotal" value={formatPrice(cart.subtotalMinor, cart.currency)} />
            {cart.discountMinor > 0n ? (
              <Row
                label={`Discount${cart.couponCode ? ` (${cart.couponCode})` : ""}`}
                value={`- ${formatPrice(cart.discountMinor, cart.currency)}`}
              />
            ) : null}
            <Row label="Shipping" value="Calculated at checkout" subtle />
          </dl>

          <div className="mt-5">
            <CouponInput />
          </div>

          <Separator className="my-5" />
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-xl font-semibold">
              {formatPrice(cart.totalMinor, cart.currency)}
            </span>
          </div>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link href="/checkout">Checkout</Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Taxes and shipping calculated at checkout.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={subtle ? "text-zinc-500" : ""}>{value}</dd>
    </div>
  );
}

function CartPageSkeleton() {
  return (
    <div className="container-page py-12 md:py-20">
      <div className="h-8 w-48 animate-pulse rounded bg-muted md:h-10" />
      <div className="mt-10 grid gap-12 lg:grid-cols-[2fr_1fr]">
        <ul className="space-y-6">
          {[0, 1].map((i) => (
            <li
              key={i}
              className="flex gap-4 rounded-2xl border border-zinc-200 bg-background p-4 dark:border-zinc-900"
            >
              <div className="aspect-square w-24 shrink-0 animate-pulse rounded-xl bg-muted" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                <div className="mt-auto h-9 w-32 animate-pulse rounded-full bg-muted" />
              </div>
            </li>
          ))}
        </ul>
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
