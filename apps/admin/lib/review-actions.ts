"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";

const ModerateInput = z.object({
  reviewId: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED", "SPAM"]),
});

export async function moderateReviewAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    // No dedicated permission for reviews yet — gate on order.read since
    // moderators are typically the same people as order support.
    requirePermission(admin, "order.read");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = ModerateInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const existing = await prisma.review.findUnique({
    where: { id: parsed.data.reviewId },
    select: {
      id: true,
      status: true,
      productId: true,
      rating: true,
      title: true,
      body: true,
    },
  });
  if (!existing) return { ok: false, error: "Review not found" };

  // On approval, promote the working copy into the published snapshot — this
  // is the version shown publicly on the PDP. Reject/Spam leave the snapshot
  // untouched, so a previously-approved review whose edit was rejected keeps
  // its old approved version live.
  const data: {
    status: string;
    publishedRating?: number;
    publishedTitle?: string | null;
    publishedBody?: string;
    publishedAt?: Date;
  } = { status: parsed.data.status };
  if (parsed.data.status === "APPROVED") {
    data.publishedRating = existing.rating;
    data.publishedTitle = existing.title;
    data.publishedBody = existing.body;
    data.publishedAt = new Date();
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: existing.id },
      data,
    });
    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "review",
        entityId: existing.id,
        action: "review.moderate",
        before: { status: existing.status } as never,
        after: { status: parsed.data.status } as never,
      },
    });
  });

  revalidatePath("/reviews");
  revalidatePath(`/products/${existing.productId}`);
  return { ok: true };
}

const DeleteInput = z.object({ reviewId: z.string().min(1) });

export async function deleteReviewAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "order.refund"); // higher-bar permission
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = DeleteInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const review = await prisma.review.findUnique({
    where: { id: parsed.data.reviewId },
    select: { id: true, productId: true },
  });
  if (!review) return { ok: false, error: "Review not found" };

  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id: review.id },
      data: { deletedAt: new Date(), status: "REJECTED" },
    });
    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "review",
        entityId: review.id,
        action: "review.delete",
      },
    });
  });

  revalidatePath("/reviews");
  revalidatePath(`/products/${review.productId}`);
  return { ok: true };
}
