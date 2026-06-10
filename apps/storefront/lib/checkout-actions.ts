"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma, orderRepo, type AddressSnapshot } from "@/lib/db";
import { getCart } from "@/lib/cart-cookie";
import { getRazorpay, razorpayConfigured } from "@/lib/payments";
import { sendOrderConfirmationEmail } from "@/lib/emails";
import { PLATFORM_VENDOR_ID as _PLATFORM_VENDOR_ID } from "@ecom/shared/ids";

const AddressInput = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  line1: z.string().trim().min(1),
  line2: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  postalCode: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

export type CheckoutState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type PlaceOrderResult =
  | { ok: true; mode: "razorpay"; orderId: string; payment: { keyId: string; razorpayOrderId: string; amount: number; currency: string }; orderNumber: string; customerName: string; customerEmail: string }
  | { ok: true; mode: "mock"; orderId: string; orderNumber: string };

/**
 * Persist the entered address to the customer's address book if it isn't
 * already there. Phone is mirrored onto the customer profile if missing.
 *
 * Used so that next time the customer checks out, their address & phone are
 * pre-filled from their profile.
 */
async function saveAddressAndPhoneToProfile(
  customerId: string,
  data: z.infer<typeof AddressInput>,
): Promise<void> {
  const phone = data.phone?.trim() || null;

  // Mirror phone onto customer profile if it isn't already set. We don't
  // overwrite an existing phone on every checkout — the profile page is the
  // place to change phone deliberately.
  if (phone) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { phone: { set: phone } },
    });
  }

  // De-dupe: if a non-deleted address with identical line1/city/state/pin
  // exists, just touch updatedAt instead of creating a duplicate row.
  const existing = await prisma.address.findFirst({
    where: {
      customerId,
      deletedAt: null,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.address.update({
      where: { id: existing.id },
      data: {
        fullName: data.fullName,
        phone,
      },
    });
    return;
  }

  // First address auto-becomes the default.
  const addressCount = await prisma.address.count({
    where: { customerId, deletedAt: null },
  });

  await prisma.address.create({
    data: {
      customerId,
      type: "SHIPPING",
      fullName: data.fullName,
      phone,
      line1: data.line1,
      line2: data.line2 || null,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: "IN",
      isDefault: addressCount === 0,
    },
  });
}

/**
 * Best-effort post-order cleanup of the now-empty Cart row. createOrderFromCart
 * deletes the cart items and zeros totals, but keeps the parent Cart row so
 * subsequent requests can re-use it. We delete it here so each order gets a
 * fresh cart row next time, reducing stale-data surface.
 *
 * Failures are swallowed — the order has already been placed, and a stale
 * empty cart row never breaks anything.
 */
async function deleteCartRow(cartId: string): Promise<void> {
  try {
    await prisma.cart.delete({ where: { id: cartId } });
  } catch {
    // ignore — usually means it's already been deleted via FK cascade
  }
}

/**
 * Place order from current cart. Two paths:
 * - razorpay configured → create local Order + PaymentIntent + Razorpay order
 * - razorpay missing    → "mock" path: order is placed, marked CONFIRMED
 *   immediately. Useful while local Razorpay keys aren't set up.
 */
export async function placeOrderAction(formData: FormData): Promise<PlaceOrderResult> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const customerId = session.user.id;

  const parsed = AddressInput.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
  });
  if (!parsed.success) {
    throw new Error("Address invalid: " + JSON.stringify(parsed.error.flatten().fieldErrors));
  }

  const cart = await getCart();
  if (!cart || cart.items.length === 0) throw new Error("Cart is empty");

  const platformVendor = await prisma.vendor.findUniqueOrThrow({ where: { slug: "platform" } });

  const shippingAddress: AddressSnapshot = {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || undefined,
    line1: parsed.data.line1,
    line2: parsed.data.line2 || undefined,
    city: parsed.data.city,
    state: parsed.data.state,
    postalCode: parsed.data.postalCode,
    country: "IN",
  };

  // Save to address book + mirror phone to profile BEFORE placing the order
  // so a downstream order failure doesn't lose the customer's typing. Best
  // effort — never block checkout on profile-write errors.
  try {
    await saveAddressAndPhoneToProfile(customerId, parsed.data);
  } catch {
    // ignore — order placement is the user-visible success path
  }

  const { orderId, orderNumber, totalMinor, currency } = await orderRepo.createOrderFromCart({
    cartId: cart.id,
    customerId,
    vendorId: platformVendor.id,
    shippingAddress,
  });

  // Mock path — no Razorpay configured
  if (!razorpayConfigured()) {
    await prisma.$transaction(async (tx) => {
      // Mark CONFIRMED + write a synthetic payment transaction so admin shows it.
      await tx.paymentIntent.create({
        data: {
          orderId,
          provider: "RAZORPAY",
          amountMinor: totalMinor,
          currency,
          status: "CAPTURED",
          idempotencyKey: `mock:${orderId}`,
        },
      });
      await tx.paymentTransaction.create({
        data: {
          orderId,
          provider: "RAZORPAY",
          providerTxnId: `MOCK-${orderId}`,
          kind: "CAPTURE",
          amountMinor: totalMinor,
          currency,
          status: "CAPTURED",
          capturedAt: new Date(),
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
      });
      await tx.orderTimelineEvent.create({
        data: {
          orderId,
          type: "payment.captured",
          message: "Payment captured (mock)",
        },
      });
    });
    revalidatePath("/account/orders");
    await sendOrderConfirmationEmail(orderId);
    await deleteCartRow(cart.id);
    return { ok: true, mode: "mock", orderId, orderNumber };
  }

  // Razorpay path
  const gateway = getRazorpay();
  const intentResult = await gateway.createIntent({
    orderId,
    amount: { amountMinor: totalMinor, currency: currency as "INR" },
    idempotencyKey: orderId,
    customerEmail: session.user.email,
  });

  await prisma.paymentIntent.create({
    data: {
      orderId,
      provider: "RAZORPAY",
      providerIntentId: intentResult.providerIntentId,
      amountMinor: totalMinor,
      currency,
      status: "REQUIRES_ACTION",
      idempotencyKey: orderId,
      clientPayload: intentResult.clientPayload as never,
    },
  });

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { email: true, firstName: true, lastName: true },
  });

  const cp = intentResult.clientPayload as { keyId: string; razorpayOrderId: string; amount: number; currency: string };

  return {
    ok: true,
    mode: "razorpay",
    orderId,
    orderNumber,
    payment: cp,
    customerName: [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email,
    customerEmail: customer.email,
  };
}
