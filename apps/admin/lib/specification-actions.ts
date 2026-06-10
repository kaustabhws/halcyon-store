"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";

export type SpecActionResult = { ok: true } | { ok: false; error: string };

const AddSpecSchema = z.object({
  productId: z.string().min(1),
  key: z.string().trim().min(1, "Key is required"),
  value: z.string().trim().min(1, "Value is required"),
});

const DeleteSpecSchema = z.object({
  specId: z.string().min(1),
  productId: z.string().min(1),
});

export async function addSpecificationAction(
  formData: FormData,
): Promise<SpecActionResult> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = AddSpecSchema.safeParse({
    productId: formData.get("productId"),
    key: formData.get("key"),
    value: formData.get("value"),
  });
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { ok: false, error: first ?? "Invalid input" };
  }

  const maxPos = await prisma.specification.aggregate({
    where: { productId: parsed.data.productId },
    _max: { position: true },
  });

  await prisma.specification.create({
    data: {
      productId: parsed.data.productId,
      key: parsed.data.key,
      value: parsed.data.value,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  revalidatePath(`/products/${parsed.data.productId}`);
  return { ok: true };
}

export async function deleteSpecificationAction(
  formData: FormData,
): Promise<SpecActionResult> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = DeleteSpecSchema.safeParse({
    specId: formData.get("specId"),
    productId: formData.get("productId"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await prisma.specification.delete({ where: { id: parsed.data.specId } });

  revalidatePath(`/products/${parsed.data.productId}`);
  return { ok: true };
}
