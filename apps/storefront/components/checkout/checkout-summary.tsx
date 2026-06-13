"use client";

import * as React from "react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { CouponInput } from "@/components/cart/coupon-input";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";

/**
 * Checkout order summary. Reads the live cart store (same source as the cart
 * page) so applying/removing a coupon updates the totals in place — the coupon
 * is persisted server-side, so placeOrderAction's getCart() sees it too.
 */
export function CheckoutSummary() {
  const hydrated = useCartStore((s) => s.hydrated);
  const cart = useCartStore((s) => s.cart);
  const reconcile = useCartStore((s) => s.reconcile);

  React.useEffect(() => {
    if (hydrated) void reconcile();
  }, [hydrated, reconcile]);

  if (!hydrated) {
    return (
      <aside className="h-72 animate-pulse rounded-2xl border border-zinc-200 bg-muted dark:border-zinc-900" />
    );
  }

  return (
    <aside className="h-fit space-y-6 rounded-2xl border border-zinc-200 bg-background p-6 dark:border-zinc-900">
      <h2 className="text-lg font-semibold tracking-tight">Order summary</h2>

      <ul className="space-y-4">
        {cart.items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.productName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium leading-snug">{item.productName}</p>
              {item.attributes.length > 0 ? (
                <p className="text-xs text-zinc-500">
                  {item.attributes.map((a) => a.valueLabel).join(" / ")}
                </p>
              ) : item.variantName ? (
                <p className="text-xs text-zinc-500">{item.variantName}</p>
              ) : null}
              <p className="mt-0.5 text-xs text-zinc-500">Qty {item.quantity}</p>
            </div>
            <p className="self-start text-sm font-semibold">
              {formatPrice(item.lineTotalMinor, item.currency)}
            </p>
          </li>
        ))}
      </ul>

      <Separator />

      <dl className="space-y-2 text-sm">
        <Row label="Subtotal" value={formatPrice(cart.subtotalMinor, cart.currency)} />
        {cart.discountMinor > 0n ? (
          <Row
            label={`Discount${cart.couponCode ? ` (${cart.couponCode})` : ""}`}
            value={`- ${formatPrice(cart.discountMinor, cart.currency)}`}
          />
        ) : null}
        <Row label="Shipping" value="Free" subtle />
      </dl>

      <CouponInput />

      <Separator />
      <div className="flex items-baseline justify-between">
        <span className="text-base font-semibold">Total</span>
        <span className="text-xl font-semibold">
          {formatPrice(cart.totalMinor, cart.currency)}
        </span>
      </div>
    </aside>
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
