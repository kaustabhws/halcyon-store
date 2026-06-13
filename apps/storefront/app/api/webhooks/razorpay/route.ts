import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, orderRepo } from "@/lib/db";
import { getRazorpay, razorpayConfigured } from "@/lib/payments";

export const dynamic = "force-dynamic";

const PaymentEntity = z.object({
  id: z.string(),
  order_id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
  error_code: z.string().nullable().optional(),
  error_description: z.string().nullable().optional(),
});
type PaymentEntity = z.infer<typeof PaymentEntity>;

const RefundEntity = z.object({
  id: z.string(),
  payment_id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
});
type RefundEntity = z.infer<typeof RefundEntity>;

const RazorpayWebhookSchema = z.object({
  event: z.string().optional(),
  payload: z
    .object({
      payment: z.object({ entity: PaymentEntity }).optional(),
      refund: z.object({ entity: RefundEntity }).optional(),
    })
    .optional(),
});

/**
 * Razorpay webhook handler.
 *
 * Idempotent on (provider, providerEventId). Verified by HMAC inside the
 * gateway. Storefront is the authoritative recipient — admin app does not
 * receive payment webhooks.
 */
export async function POST(req: Request) {
  if (!razorpayConfigured()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  let event: Awaited<ReturnType<ReturnType<typeof getRazorpay>["verifyWebhook"]>>;
  try {
    event = await getRazorpay().verifyWebhook(req.clone());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bad signature" },
      { status: 400 },
    );
  }

  // Idempotency
  const existing = await prisma.webhookEvent.findUnique({
    where: { provider_providerEventId: { provider: "RAZORPAY", providerEventId: event.providerEventId } },
  });
  if (existing && existing.status === "DELIVERED") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const webhookRow = existing
    ? await prisma.webhookEvent.update({
        where: { id: existing.id },
        data: { attempts: { increment: 1 } },
      })
    : await prisma.webhookEvent.create({
        data: {
          provider: "RAZORPAY",
          providerEventId: event.providerEventId,
          type: event.type,
          payload: event.payload as never,
          signatureValid: true,
          status: "PENDING",
          attempts: 1,
        },
      });

  try {
    await handleEvent(event.type, event.payload);
    await prisma.webhookEvent.update({
      where: { id: webhookRow.id },
      data: { status: "DELIVERED", processedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await prisma.webhookEvent.update({
      where: { id: webhookRow.id },
      data: {
        status: "FAILED",
        error: e instanceof Error ? e.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Handler failed" },
      { status: 500 },
    );
  }
}

async function handleEvent(type: string, raw: Record<string, unknown>) {
  // The gateway already HMAC-verified the request; we still zod-parse the
  // payload shape so the handler reads typed fields, not hand-cast unknowns.
  // A parse failure means Razorpay sent us something we don't recognize —
  // bail rather than silently no-op'ing on a typo'd field name.
  const parsed = RazorpayWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Razorpay webhook payload did not match expected shape: ${parsed.error.message}`,
    );
  }
  const body = parsed.data;

  switch (type) {
    case "payment.authorized":
    case "payment.captured": {
      const p = body.payload?.payment?.entity;
      if (!p) return;
      await handlePayment(type, p);
      return;
    }
    case "payment.failed": {
      const p = body.payload?.payment?.entity;
      if (!p) return;
      await handlePaymentFailed(p);
      return;
    }
    case "refund.created":
    case "refund.processed": {
      const r = body.payload?.refund?.entity;
      if (!r) return;
      await handleRefund(type, r);
      return;
    }
    default:
      // Unknown event types are stored as DELIVERED no-op.
      return;
  }
}

async function handlePayment(type: string, p: PaymentEntity): Promise<void> {
  const intent = await prisma.paymentIntent.findUnique({
    where: { provider_providerIntentId: { provider: "RAZORPAY", providerIntentId: p.order_id } },
  });
  if (!intent) return;

  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.upsert({
      where: {
        provider_providerTxnId: {
          provider: "RAZORPAY",
          providerTxnId: p.id,
        },
      },
      update: {
        status: type === "payment.captured" ? "CAPTURED" : "AUTHORIZED",
        capturedAt: type === "payment.captured" ? new Date() : null,
        raw: p as never,
      },
      create: {
        orderId: intent.orderId,
        provider: "RAZORPAY",
        providerTxnId: p.id,
        kind: type === "payment.captured" ? "CAPTURE" : "AUTH",
        amountMinor: BigInt(p.amount),
        currency: p.currency,
        status: type === "payment.captured" ? "CAPTURED" : "AUTHORIZED",
        capturedAt: type === "payment.captured" ? new Date() : null,
        raw: p as never,
      },
    });

    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: { status: type === "payment.captured" ? "CAPTURED" : "AUTHORIZED" },
    });
  });

  // Confirm on capture. markOrderPaid is idempotent and the single owner of
  // the status transition + coupon redemption + cart clear — so this is the
  // backstop for when the browser never completes the verify handshake.
  if (type === "payment.captured") {
    await orderRepo.markOrderPaid({
      orderId: intent.orderId,
      actor: { kind: "SYSTEM" },
      message: "Payment captured (webhook)",
    });
  }
}

async function handlePaymentFailed(p: PaymentEntity): Promise<void> {
  const intent = await prisma.paymentIntent.findUnique({
    where: { provider_providerIntentId: { provider: "RAZORPAY", providerIntentId: p.order_id } },
  });
  if (!intent) return;

  await prisma.$transaction(async (tx) => {
    await tx.paymentIntent.update({
      where: { id: intent.id },
      data: { status: "FAILED" },
    });
    await tx.paymentAttempt.create({
      data: {
        paymentIntentId: intent.id,
        attemptNumber: 1,
        status: "FAILED",
        errorCode: p.error_code ?? null,
        errorMessage: p.error_description ?? null,
        providerPayload: p as never,
      },
    });
    await tx.order.update({
      where: { id: intent.orderId },
      data: { status: "FAILED" },
    });
    await tx.orderTimelineEvent.create({
      data: {
        orderId: intent.orderId,
        type: "payment.failed",
        message: p.error_description ?? "Payment failed",
        actorKind: "SYSTEM",
      },
    });
  });
}

async function handleRefund(type: string, r: RefundEntity): Promise<void> {
  const txn = await prisma.paymentTransaction.findUnique({
    where: { provider_providerTxnId: { provider: "RAZORPAY", providerTxnId: r.payment_id } },
  });
  if (!txn) return;
  await prisma.refund.upsert({
    where: { id: r.id },
    update: {
      status: type === "refund.processed" ? "SUCCEEDED" : "PROCESSING",
      processedAt: type === "refund.processed" ? new Date() : null,
    },
    create: {
      id: r.id,
      orderId: txn.orderId,
      paymentTransactionId: txn.id,
      amountMinor: BigInt(r.amount),
      currency: r.currency,
      status: type === "refund.processed" ? "SUCCEEDED" : "PROCESSING",
      providerRefundId: r.id,
      processedAt: type === "refund.processed" ? new Date() : null,
    },
  });
}
