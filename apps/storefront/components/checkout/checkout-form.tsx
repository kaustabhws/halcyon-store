"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "@ecom/shared/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeOrderAction } from "@/lib/checkout-actions";
import { useCartStore } from "@/lib/cart-store";

type AddressDefaults = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
};

async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutForm({
  defaultAddress,
}: {
  defaultAddress: AddressDefaults | null;
}) {
  const router = useRouter();
  const clearLocal = useCartStore((s) => s.clearLocal);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const result = await placeOrderAction(fd);

      if (result.mode === "mock") {
        clearLocal();
        router.push(`/checkout/success?orderId=${result.orderId}`);
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) {
        setError("Could not load Razorpay. Try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: result.payment.keyId,
        amount: result.payment.amount,
        currency: result.payment.currency,
        order_id: result.payment.razorpayOrderId,
        name: BRAND.name,
        description: `Order ${result.orderNumber}`,
        prefill: { name: result.customerName, email: result.customerEmail },
        theme: { color: "#0a0a0a" },
        handler: async (resp) => {
          const verify = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: result.orderId,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            }),
          });
          if (verify.ok) {
            clearLocal();
            router.push(`/checkout/success?orderId=${result.orderId}`);
          } else {
            setError("Payment verification failed. Contact support.");
          }
        },
        modal: {
          ondismiss: () => setPending(false),
        },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4">
        <header className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Shipping address</h2>
          <span className="text-xs text-zinc-500">India only</span>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" required defaultValue={defaultAddress?.fullName} className="sm:col-span-2" autoComplete="name" />
          <Field label="Address line 1" name="line1" required defaultValue={defaultAddress?.line1} className="sm:col-span-2" autoComplete="address-line1" />
          <Field label="Address line 2 (optional)" name="line2" defaultValue={defaultAddress?.line2} className="sm:col-span-2" autoComplete="address-line2" />
          <Field label="City" name="city" required defaultValue={defaultAddress?.city} autoComplete="address-level2" />
          <Field label="State" name="state" required defaultValue={defaultAddress?.state} autoComplete="address-level1" />
          <Field label="PIN code" name="postalCode" required defaultValue={defaultAddress?.postalCode} pattern="\d{6}" inputMode="numeric" autoComplete="postal-code" />
          <Field label="Phone (optional)" name="phone" defaultValue={defaultAddress?.phone} inputMode="tel" autoComplete="tel" />
        </div>
      </section>

      {error ? (
        <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Processing…" : "Pay and place order"}
      </Button>
      <p className="text-center text-xs text-zinc-500">
        By placing this order, you agree to our terms of service.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  defaultValue,
  pattern,
  inputMode,
  autoComplete,
  className,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  pattern?: string;
  inputMode?: "text" | "numeric" | "tel";
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        pattern={pattern}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="mt-1.5"
      />
    </div>
  );
}
