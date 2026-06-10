"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";

export type FeaturedActionResult = { ok: true } | { ok: false; error: string };

const ToggleFeaturedSchema = z.object({
  productId: z.string().min(1),
  featured: z.enum(["true", "false"]),
});

const SetHeroSchema = z.object({
  productId: z.string().min(1).or(z.literal("")),
});

export async function toggleFeaturedAction(
  formData: FormData,
): Promise<FeaturedActionResult> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = ToggleFeaturedSchema.safeParse({
    productId: formData.get("productId"),
    featured: formData.get("featured"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await prisma.product.update({
    where: { id: parsed.data.productId },
    data: { isFeatured: parsed.data.featured === "true" },
  });

  revalidatePath("/products/featured");
  revalidatePath("/products");
  return { ok: true };
}

export async function setHeroProductAction(
  formData: FormData,
): Promise<FeaturedActionResult> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "settings.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = SetHeroSchema.safeParse({
    productId: formData.get("productId"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const key = "homepage.heroProductId";
  const value = parsed.data.productId || null;

  if (value) {
    const existing = await prisma.setting.findFirst({
      where: { scope: "PLATFORM", vendorId: null, key },
    });
    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: value as unknown as never },
      });
    } else {
      await prisma.setting.create({
        data: { scope: "PLATFORM", key, value: value as unknown as never },
      });
    }
  } else {
    await prisma.setting.deleteMany({
      where: { scope: "PLATFORM", vendorId: null, key },
    });
  }

  revalidatePath("/products/featured");
  return { ok: true };
}
