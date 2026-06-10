import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/emails";
import { verifyRazorpayCheckoutSignature } from "@ecom/payments/razorpay";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 500 });
  }

  const ok = verifyRazorpayCheckoutSignature({
    razorpayOrderId: parsed.data.razorpayOrderId,
    razorpayPaymentId: parsed.data.razorpayPaymentId,
    razorpaySignature: parsed.data.razorpaySignature,
    keySecret,
  });
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { id: true, customerId: true, totalMinor: true, currency: true, status: true },
  });
  if (!order || order.customerId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Idempotent upsert of intent + transaction; webhook is still authoritative.
  await prisma.$transaction(async (tx) => {
    await tx.paymentIntent.update({
      where: { provider_providerIntentId: { provider: "RAZORPAY", providerIntentId: parsed.data.razorpayOrderId } },
      data: { status: "CAPTURED" },
    }).catch(() => undefined);

    await tx.paymentTransaction.upsert({
      where: {
        provider_providerTxnId: {
          provider: "RAZORPAY",
          providerTxnId: parsed.data.razorpayPaymentId,
        },
      },
      update: { status: "CAPTURED", capturedAt: new Date() },
      create: {
        orderId: order.id,
        provider: "RAZORPAY",
        providerTxnId: parsed.data.razorpayPaymentId,
        kind: "CAPTURE",
        amountMinor: order.totalMinor,
        currency: order.currency,
        status: "CAPTURED",
        capturedAt: new Date(),
      },
    });

    if (order.status === "PENDING") {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED" },
      });
      await tx.orderTimelineEvent.create({
        data: {
          orderId: order.id,
          type: "payment.captured",
          message: "Payment captured via checkout handshake",
          actorKind: "CUSTOMER",
          actorId: session.user.id,
        },
      });
    }
  });

  // Send the confirmation email after the transaction commits. Fire-and-
  // forget so a mail provider hiccup never blocks payment acknowledgement.
  void sendOrderConfirmationEmail(order.id);

  // Order is paid; the customer's cart row (already empty of items inside
  // createOrderFromCart) is no longer useful. Best-effort delete so cleanup
  // matches the mock-payment path.
  await prisma.cart
    .deleteMany({ where: { customerId: session.user.id } })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
