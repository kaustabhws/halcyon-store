"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantName: string | null;
  sku: string;
  brandName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPriceMinor: bigint;
  lineTotalMinor: bigint;
  currency: string;
  available: number;
  attributes: Array<{
    code: string;
    label: string;
    value: string;
    valueLabel: string;
    swatchHex: string | null;
  }>;
};

export type CartSnapshot = {
  id: string | null;
  currency: string;
  subtotalMinor: bigint;
  discountMinor: bigint;
  shippingMinor: bigint;
  totalMinor: bigint;
  couponCode: string | null;
  itemCount: number;
  items: CartLine[];
};

type WireMoney = string | number;
type WireLine = Omit<CartLine, "unitPriceMinor" | "lineTotalMinor"> & {
  unitPriceMinor: WireMoney;
  lineTotalMinor: WireMoney;
};
export type WireCart = {
  id?: string | null;
  currency: string;
  subtotalMinor: WireMoney;
  discountMinor: WireMoney;
  shippingMinor: WireMoney;
  totalMinor: WireMoney;
  couponCode: string | null;
  itemCount: number;
  items: WireLine[];
};

function toBigInt(x: WireMoney | bigint): bigint {
  if (typeof x === "bigint") return x;
  return BigInt(String(x));
}

export function decodeWireCart(wire: WireCart): CartSnapshot {
  return {
    id: wire.id ?? null,
    currency: wire.currency,
    subtotalMinor: toBigInt(wire.subtotalMinor),
    discountMinor: toBigInt(wire.discountMinor),
    shippingMinor: toBigInt(wire.shippingMinor),
    totalMinor: toBigInt(wire.totalMinor),
    couponCode: wire.couponCode,
    itemCount: wire.itemCount,
    items: wire.items.map((i) => ({
      ...i,
      unitPriceMinor: toBigInt(i.unitPriceMinor),
      lineTotalMinor: toBigInt(i.lineTotalMinor),
    })),
  };
}

const EMPTY: CartSnapshot = {
  id: null,
  currency: "INR",
  subtotalMinor: 0n,
  discountMinor: 0n,
  shippingMinor: 0n,
  totalMinor: 0n,
  couponCode: null,
  itemCount: 0,
  items: [],
};

type MutateResult =
  | { ok: true }
  | { ok: false; error: string };

type CartState = {
  cart: CartSnapshot;
  hydrated: boolean;
  reconciling: boolean;

  setCart: (snapshot: CartSnapshot) => void;
  reconcile: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<MutateResult>;
  setQuantity: (itemId: string, quantity: number) => Promise<MutateResult>;
  removeItem: (itemId: string) => Promise<MutateResult>;
  applyCoupon: (code: string) => Promise<MutateResult>;
  removeCoupon: () => Promise<MutateResult>;
  clearLocal: () => void;
};

/**
 * Bigint-aware JSON storage: encodes bigints as { __b: "123" }, decodes them
 * back on read. Without this, persist() blows up on JSON.stringify.
 */
function bigintReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return { __b: value.toString() };
  return value;
}

function bigintReviver(_key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === "object" &&
    "__b" in value &&
    typeof (value as { __b: unknown }).__b === "string"
  ) {
    return BigInt((value as { __b: string }).__b);
  }
  return value;
}

const cartStorage = createJSONStorage<Pick<CartState, "cart">>(
  () => localStorage,
  {
    replacer: bigintReplacer,
    reviver: bigintReviver,
  },
);

async function postJSON(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
}

async function patchJSON(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
}

async function readJSON(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function errorOf(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const e = (payload as { error: unknown }).error;
    if (typeof e === "string") return e;
  }
  return fallback;
}

/**
 * Optimistic local mutation for set-quantity / remove. Recomputes line totals
 * and itemCount but NOT subtotals/discount — server will overwrite those on
 * reconcile. Coupon math is server-only.
 */
function applyLocalQuantity(
  cart: CartSnapshot,
  itemId: string,
  quantity: number,
): CartSnapshot {
  if (quantity <= 0) {
    const items = cart.items.filter((i) => i.id !== itemId);
    return { ...cart, items, itemCount: items.reduce((n, i) => n + i.quantity, 0) };
  }
  const items = cart.items.map((i) =>
    i.id === itemId
      ? { ...i, quantity, lineTotalMinor: i.unitPriceMinor * BigInt(quantity) }
      : i,
  );
  return { ...cart, items, itemCount: items.reduce((n, i) => n + i.quantity, 0) };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: EMPTY,
      hydrated: false,
      reconciling: false,

      setCart: (snapshot) => set({ cart: snapshot }),

      reconcile: async () => {
        if (get().reconciling) return;
        set({ reconciling: true });
        try {
          const res = await fetch("/api/cart/items", {
            cache: "no-store",
            credentials: "same-origin",
          });
          if (!res.ok) return;
          const wire = (await readJSON(res)) as WireCart | null;
          if (!wire) return;
          set({ cart: decodeWireCart(wire) });
        } finally {
          set({ reconciling: false });
        }
      },

      addItem: async (variantId, quantity = 1) => {
        // No optimistic insert: we don't have product metadata client-side
        // for an unknown variant. Server response gives us the canonical line.
        const res = await postJSON("/api/cart/items", { variantId, quantity });
        const payload = await readJSON(res);
        if (!res.ok) {
          return { ok: false, error: errorOf(payload, "Could not add to bag") };
        }
        set({ cart: decodeWireCart(payload as WireCart) });
        return { ok: true };
      },

      setQuantity: async (itemId, quantity) => {
        const before = get().cart;
        set({ cart: applyLocalQuantity(before, itemId, quantity) });
        try {
          const res =
            quantity <= 0
              ? await fetch(`/api/cart/items/${itemId}`, {
                  method: "DELETE",
                  credentials: "same-origin",
                })
              : await patchJSON(`/api/cart/items/${itemId}`, { quantity });
          const payload = await readJSON(res);
          if (!res.ok) {
            set({ cart: before });
            return { ok: false, error: errorOf(payload, "Could not update bag") };
          }
          set({ cart: decodeWireCart(payload as WireCart) });
          return { ok: true };
        } catch (e) {
          set({ cart: before });
          return {
            ok: false,
            error: e instanceof Error ? e.message : "Network error",
          };
        }
      },

      removeItem: async (itemId) => {
        return get().setQuantity(itemId, 0);
      },

      applyCoupon: async (code) => {
        const res = await postJSON("/api/cart/coupon", { code });
        const payload = await readJSON(res);
        if (!res.ok) {
          return { ok: false, error: errorOf(payload, "Couldn't apply that code") };
        }
        set({ cart: decodeWireCart(payload as WireCart) });
        return { ok: true };
      },

      removeCoupon: async () => {
        const res = await fetch("/api/cart/coupon", {
          method: "DELETE",
          credentials: "same-origin",
        });
        const payload = await readJSON(res);
        if (!res.ok) {
          return { ok: false, error: errorOf(payload, "Couldn't remove the code") };
        }
        set({ cart: decodeWireCart(payload as WireCart) });
        return { ok: true };
      },

      clearLocal: () => set({ cart: EMPTY }),
    }),
    {
      name: "halcyon.cart.v1",
      storage: cartStorage,
      // Only persist cart data, not the action functions or transient flags.
      partialize: (state) => ({ cart: state.cart }) as Pick<CartState, "cart">,
      // We rehydrate manually inside CartProvider on mount to avoid SSR/CSR
      // mismatch — the server has no localStorage to read from.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setCart(state.cart);
      },
    },
  ),
);

/**
 * Selector helpers — components subscribe with these so they only re-render
 * on the field they care about. Counts are the hot path (header badge).
 */
export const selectItemCount = (s: CartState): number => s.cart.itemCount;
export const selectHydrated = (s: CartState): boolean => s.hydrated;

