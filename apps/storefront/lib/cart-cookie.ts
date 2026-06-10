import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { cartRepo, type CartView } from "@/lib/db";

const CART_COOKIE = "ecom_cart";
const SIX_MONTHS_S = 60 * 60 * 24 * 30 * 6;

function generateToken(): string {
  // 22-char URL-safe random; collision-resistant for our scale.
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
}

/**
 * Returns the current cart for this request, creating one if needed. Resolves
 * in this order:
 *
 *  1. Logged in + anon cookie present → merge anon into customer cart, clear
 *     cookie, return merged customer cart. (Catches the case where login
 *     happened on a different surface that didn't run the inline merge —
 *     e.g. Google OAuth.)
 *  2. Logged in, no cookie → return existing customer cart, or create one.
 *  3. Anonymous + cookie → return that cart, or create a new one if the row
 *     was cleaned up.
 *  4. Anonymous, no cookie → mint a token, create an anon cart, set cookie.
 */
export async function getOrCreateCart(): Promise<CartView> {
  const jar = await cookies();
  const session = await auth();
  const customerId = session?.user?.id ?? null;
  const cookieToken = jar.get(CART_COOKIE)?.value ?? null;

  if (customerId) {
    if (cookieToken) {
      // Best-effort merge. Only drop the cookie on success — if the merge
      // throws (tx timeout, transient error), keep the cookie so the next
      // request can retry instead of orphaning the customer's items.
      try {
        const merged = await cartRepo.mergeAnonymousIntoCustomerCart({
          anonymousToken: cookieToken,
          customerId,
        });
        jar.delete(CART_COOKIE);
        return merged;
      } catch {
        // Fall through to customer-cart lookup; if a customer cart exists
        // (e.g. inline merge succeeded earlier), we still return that.
      }
    }
    const existing = await cartRepo.findCartByCustomerId(customerId);
    if (existing) return existing;
    return cartRepo.createCart({ customerId });
  }

  // Anonymous path
  if (cookieToken) {
    const cart = await cartRepo.findCartByToken(cookieToken);
    if (cart) return cart;
  }

  const token = generateToken();
  const cart = await cartRepo.createCart({ anonymousToken: token });
  jar.set(CART_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SIX_MONTHS_S,
  });
  return cart;
}

/**
 * Read-only variant: returns the current cart or null without creating one.
 * Used on pages that just want to read (checkout summary, etc.) so we don't
 * mint an empty anonymous cart on every page view from a logged-out visitor.
 *
 * Logged-in users return their customer cart even if the cookie is missing.
 */
export async function getCart(): Promise<CartView | null> {
  const jar = await cookies();
  const session = await auth();
  const customerId = session?.user?.id ?? null;

  if (customerId) {
    return cartRepo.findCartByCustomerId(customerId);
  }

  const cookieToken = jar.get(CART_COOKIE)?.value;
  if (!cookieToken) return null;
  return cartRepo.findCartByToken(cookieToken);
}
