import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Releases inventory reservations that have passed their `expiresAt`. The
 * 15-minute hold placed by `createOrderFromCart` is meant to be temporary —
 * if the customer abandons checkout (or Razorpay never confirms), this job
 * frees the stock and cancels the abandoned order.
 *
 * Auth: caller must present `Authorization: Bearer ${CRON_SECRET}`. If
 * `CRON_SECRET` isn't set, the route refuses every request (fail-safe).
 *
 * Vercel Cron + GitHub Actions both support the bearer pattern.
 */
export async function POST(req: Request) {
  return run(req);
}

export async function GET(req: Request) {
  return run(req);
}

async function run(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expired = await prisma.inventoryReservation.findMany({
    where: { expiresAt: { lte: now }, releasedAt: null },
    take: 500, // Cap per run to keep the job bounded
  });

  if (expired.length === 0) {
    return NextResponse.json({ ok: true, released: 0, ordersCancelled: 0 });
  }

  const orderIds = new Set<string>();
  let releasedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const r of expired) {
      // Decrement reserved on the matching InventoryLevel row, but never go
      // below zero (defensive — the level row may have been edited by an
      // admin in the meantime).
      const level = await tx.inventoryLevel.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: r.warehouseId,
            variantId: r.variantId,
          },
        },
      });
      if (level && level.reserved > 0) {
        await tx.inventoryLevel.update({
          where: { id: level.id },
          data: {
            reserved: Math.max(0, level.reserved - r.quantity),
            version: { increment: 1 },
          },
        });
      }
      await tx.inventoryReservation.update({
        where: { id: r.id },
        data: { releasedAt: now },
      });
      releasedCount++;
      if (r.orderId) orderIds.add(r.orderId);
    }

    // Cancel any order that's still PENDING and whose reservations have
    // all expired. A captured order will already have moved to CONFIRMED
    // by the webhook before its reservations expire.
    for (const orderId of orderIds) {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      });
      if (!order) continue;
      if (order.status !== "PENDING") continue;

      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", cancelledAt: now },
      });
      await tx.orderTimelineEvent.create({
        data: {
          orderId: order.id,
          type: "order.cancelled",
          message: "Order auto-cancelled (payment not received before reservation expired)",
          actorKind: "SYSTEM",
        },
      });
      await tx.paymentIntent.updateMany({
        where: { orderId: order.id, status: { in: ["REQUIRES_ACTION", "PROCESSING"] } },
        data: { status: "FAILED" },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    released: releasedCount,
    ordersCancelled: orderIds.size,
  });
}
