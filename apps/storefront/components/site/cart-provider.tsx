"use client";

import * as React from "react";
import { useCartStore } from "@/lib/cart-store";

/**
 * Bootstraps the Zustand cart store on the client:
 *  1. Rehydrate from localStorage (instant, but client-only — server renders
 *     with the empty initial state to avoid SSR/CSR mismatch).
 *  2. Mark hydrated so badge / sheet can swap from the SSR placeholder to the
 *     real count.
 *  3. Fire one background reconcile against the server cart so cross-device
 *     sessions converge and any server-side mutation (login merge, coupon
 *     auto-removal, stock dropped to 0) is reflected.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await useCartStore.persist.rehydrate();
      if (cancelled) return;
      useCartStore.setState({ hydrated: true });
      // Fire-and-forget; reconcile() guards against overlapping runs.
      void useCartStore.getState().reconcile();
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}
