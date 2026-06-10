"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { sendOrderStatusEmail, sendRefundEmail } from "@/lib/emails";
import {
  PaymentGatewayRegistry,
  type IPaymentGateway,
} from "@ecom/payments";
import { RazorpayGateway } from "@ecom/payments/razorpay";

const RefundInput = z.object({
  orderId: z.string().min(1),
});

const StatusInput = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
    "REFUNDED",
    "FAILED",
  ]),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

let cachedRegistry: PaymentGatewayRegistry | null = null;
function getRegistry(): PaymentGatewayRegistry | null {
  if (cachedRegistry) return cachedRegistry;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!keyId || !keySecret || !webhookSecret) return null;
  const reg = new PaymentGatewayRegistry();
  reg.register(new RazorpayGateway({ keyId, keySecret, webhookSecret }));
  cachedRegistry = reg;
  return reg;
}

function gatewayFor(provider: string): IPaymentGateway | null {
  const reg = getRegistry();
  if (!reg) return null;
  if (provider === "RAZORPAY") {
    try {
      return reg.get("razorpay");
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Initiate a refund.
 *
 * For real (Razorpay) payments: calls Razorpay's refund API and saves the
 * provider's refund ID immediately. The webhook handler later flips status
 * PROCESSING → SUCCEEDED.
 *
 * For mock payments (no Razorpay keys configured): marks the refund
 * SUCCEEDED right away. Used in local dev where Razorpay isn't wired.
 */
export async function refundOrderAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "order.refund");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = RefundInput.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { paymentTransactions: { where: { kind: "CAPTURE", status: "CAPTURED" } } },
  });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === "REFUNDED") return { ok: false, error: "Order already refunded" };

  const capture = order.paymentTransactions[0];
  if (!capture) return { ok: false, error: "No captured payment to refund" };

  // Detect mock-payment captures (Razorpay payment IDs start with "pay_").
  const isMockCapture = capture.providerTxnId.startsWith("MOCK-");

  // 1) Create the local Refund row first so the gateway call has a stable
  //    idempotency key tied to our DB.
  const refund = await prisma.refund.create({
    data: {
      orderId: order.id,
      paymentTransactionId: capture.id,
      amountMinor: order.totalMinor,
      currency: order.currency,
      status: "PROCESSING",
      reason: "admin_initiated",
    },
  });

  // 2) Call the gateway when real Razorpay keys are present and this
  //    transaction is a real Razorpay capture.
  let providerRefundId: string | null = null;
  let gatewayError: string | null = null;
  if (!isMockCapture) {
    const gateway = gatewayFor(capture.provider);
    if (!gateway) {
      gatewayError = "Razorpay is not configured on the server.";
    } else {
      try {
        const result = await gateway.refund({
          providerTxnId: capture.providerTxnId,
          amount: { amountMinor: order.totalMinor, currency: order.currency as "INR" },
          reason: "admin_initiated",
          idempotencyKey: `refund:${refund.id}`,
        });
        providerRefundId = result.providerTxnId;
      } catch (e) {
        gatewayError = e instanceof Error ? e.message : "Gateway error";
      }
    }
  }

  // 3) If the gateway failed, roll back the Refund row and leave order
  //    status unchanged so the admin can retry.
  if (gatewayError) {
    await prisma.refund.delete({ where: { id: refund.id } });
    return { ok: false, error: `Refund failed: ${gatewayError}` };
  }

  // 4) Update DB to reflect the refund. For mock captures we mark
  //    SUCCEEDED immediately; for real Razorpay the webhook moves it
  //    SUCCEEDED, but we still flip the order status now so admin sees
  //    the refund queued.
  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id: refund.id },
      data: {
        providerRefundId,
        status: isMockCapture ? "SUCCEEDED" : "PROCESSING",
        processedAt: isMockCapture ? new Date() : null,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED" },
    });
    await tx.orderTimelineEvent.create({
      data: {
        orderId: order.id,
        type: "refund.initiated",
        message: isMockCapture
          ? `Mock refund processed by ${admin.email}`
          : `Refund queued with Razorpay by ${admin.email}`,
        actorKind: "ADMIN",
        actorId: admin.adminId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "order",
        entityId: order.id,
        action: "order.refund",
        before: { status: order.status } as never,
        after: {
          status: "REFUNDED",
          refundId: refund.id,
          providerRefundId,
          mode: isMockCapture ? "mock" : "razorpay",
        } as never,
      },
    });
  });

  void sendRefundEmail(order.id);

  revalidatePath(`/orders/${order.id}`);
  revalidatePath(`/orders`);
  return { ok: true };
}

export async function updateOrderStatusAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "order.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = StatusInput.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === parsed.data.status) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: parsed.data.status },
    });
    await tx.orderTimelineEvent.create({
      data: {
        orderId: order.id,
        type: `order.status.${parsed.data.status.toLowerCase()}`,
        message: `Status set to ${parsed.data.status} by ${admin.email}`,
        actorKind: "ADMIN",
        actorId: admin.adminId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "order",
        entityId: order.id,
        action: "order.status.update",
        before: { status: order.status } as never,
        after: { status: parsed.data.status } as never,
      },
    });
  });

  void sendOrderStatusEmail(order.id, parsed.data.status);

  revalidatePath(`/orders/${order.id}`);
  revalidatePath(`/orders`);
  return { ok: true };
}
