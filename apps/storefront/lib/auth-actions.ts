"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { prisma, cartRepo } from "@/lib/db";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const SignupSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[a-zA-Z]/, "Must contain a letter")
    .regex(/[0-9]/, "Must contain a number"),
  firstName: z.string().trim().min(1, "Required").optional().or(z.literal("")),
  lastName: z.string().trim().optional().or(z.literal("")),
  next: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Required"),
  next: z.string().optional(),
});

const CART_COOKIE = "ecom_cart";

/**
 * Whitelist next-param targets. We only allow same-origin paths and reject
 * scheme-relative URLs ("//evil.com") that browsers would treat as absolute.
 */
function safeNext(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

async function mergeAnonymousCart(customerId: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;

  try {
    await cartRepo.mergeAnonymousIntoCustomerCart({
      anonymousToken: token,
      customerId,
    });
    // Only drop the cookie when the merge actually succeeded — otherwise we
    // leave it in place so the next cart touch (via getOrCreateCart) can
    // retry the merge instead of orphaning the customer's items.
    jar.delete(CART_COOKIE);
  } catch {
    // Best-effort — never block login on a cart-merge failure. Cookie stays.
  }
}

export async function signupAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing && existing.passwordHash) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          firstName: parsed.data.firstName || existing.firstName,
          lastName: parsed.data.lastName || existing.lastName,
        },
      })
    : await prisma.customer.create({
        data: {
          email,
          passwordHash,
          firstName: parsed.data.firstName || null,
          lastName: parsed.data.lastName || null,
        },
      });

  await mergeAnonymousCart(customer.id);

  const redirectTo = safeNext(parsed.data.next, "/account");

  // Sign the user in immediately. NextAuth throws a redirect-as-error on
  // success in v5; we re-throw so Next handles the navigation.
  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Could not sign in after signup." };
    throw e;
  }

  return {};
}

export async function loginAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email.toLowerCase().trim();

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (customer) await mergeAnonymousCart(customer.id);

  const redirectTo = safeNext(parsed.data.next, "/account");

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.type === "CredentialsSignin") {
        return { error: "Email or password is incorrect." };
      }
      return { error: "Could not sign in." };
    }
    throw e;
  }

  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function googleLoginAction(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"), "/account");
  await signIn("google", { redirectTo: next });
  redirect(next);
}

/**
 * Called after any successful login (OAuth or post-signup) to merge the
 * anonymous cart cookie into the logged-in customer's cart. Safe to call
 * repeatedly — no-op when no cookie is present.
 */
export async function mergeCartAfterLoginAction(customerId: string): Promise<void> {
  await mergeAnonymousCart(customerId);
}
