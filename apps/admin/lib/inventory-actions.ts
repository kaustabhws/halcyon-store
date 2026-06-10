"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";

const AdjustmentInput = z.object({
  variantId: z.string().min(1),
  warehouseId: z.string().min(1),
  delta: z.coerce.number().int(),
  reason: z.string().trim().min(1).max(200),
});

export async function adjustInventoryAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "inventory.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = AdjustmentInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  if (parsed.data.delta === 0) return { ok: false, error: "Delta cannot be zero" };

  const level = await prisma.inventoryLevel.findUnique({
    where: {
      warehouseId_variantId: {
        warehouseId: parsed.data.warehouseId,
        variantId: parsed.data.variantId,
      },
    },
  });

  // If no row exists yet, create it (only meaningful when delta > 0).
  if (!level) {
    if (parsed.data.delta < 0) {
      return { ok: false, error: "No stock to subtract" };
    }
    await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryLevel.create({
        data: {
          warehouseId: parsed.data.warehouseId,
          variantId: parsed.data.variantId,
          onHand: parsed.data.delta,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: parsed.data.variantId,
          warehouseId: parsed.data.warehouseId,
          quantity: parsed.data.delta,
          reason: "ADJUSTMENT",
          referenceType: "inventory_adjustment",
          referenceId: created.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorKind: "ADMIN",
          actorId: admin.adminId,
          entityType: "inventory",
          entityId: created.id,
          action: "inventory.adjust",
          after: { delta: parsed.data.delta, reason: parsed.data.reason } as never,
        },
      });
    });
    revalidatePath("/inventory");
    return { ok: true };
  }

  const nextOnHand = level.onHand + parsed.data.delta;
  if (nextOnHand < 0) {
    return { ok: false, error: `Only ${level.onHand} on hand` };
  }
  if (nextOnHand < level.reserved) {
    return {
      ok: false,
      error: `Cannot reduce below reserved (${level.reserved})`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryLevel.update({
      where: { id: level.id },
      data: { onHand: nextOnHand, version: { increment: 1 } },
    });
    await tx.inventoryMovement.create({
      data: {
        variantId: parsed.data.variantId,
        warehouseId: parsed.data.warehouseId,
        quantity: parsed.data.delta,
        reason: "ADJUSTMENT",
        referenceType: "inventory_adjustment",
        referenceId: level.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "inventory",
        entityId: level.id,
        action: "inventory.adjust",
        before: { onHand: level.onHand } as never,
        after: { onHand: nextOnHand, delta: parsed.data.delta, reason: parsed.data.reason } as never,
      },
    });
  });

  revalidatePath("/inventory");
  return { ok: true };
}
