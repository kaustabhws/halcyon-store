"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { HERO_DESIGNS, HERO_SETTING_KEYS } from "@ecom/shared/hero";

export type FeaturedActionResult = { ok: true } | { ok: false; error: string };

const ToggleFeaturedSchema = z.object({
  productId: z.string().min(1),
  featured: z.enum(["true", "false"]),
});

const HeroConfigSchema = z.object({
  design: z.enum(HERO_DESIGNS),
  productId: z.string().optional().default(""),
  text: z.object({
    eyebrow: z.string().max(80).optional().default(""),
    headlineLead: z.string().max(120).optional().default(""),
    headlineEmphasis: z.string().max(120).optional().default(""),
    subtext: z.string().max(400).optional().default(""),
    primaryLabel: z.string().max(40).optional().default(""),
    primaryHref: z.string().max(200).optional().default(""),
    secondaryLabel: z.string().max(40).optional().default(""),
    secondaryHref: z.string().max(200).optional().default(""),
  }),
});

const SCOPE = "PLATFORM";

async function upsertSetting(key: string, value: unknown): Promise<void> {
  const existing = await prisma.setting.findFirst({
    where: { scope: SCOPE, vendorId: null, key },
  });
  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value: value as never },
    });
  } else {
    await prisma.setting.create({
      data: { scope: SCOPE, key, value: value as never },
    });
  }
}

async function deleteSetting(key: string): Promise<void> {
  await prisma.setting.deleteMany({ where: { scope: SCOPE, vendorId: null, key } });
}

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

/**
 * Persist the full homepage hero config: which design to render, the hero
 * product (used by image-based designs), and the editable text (used by the
 * text-based designs). Each lands in its own Setting row.
 */
export async function setHeroConfigAction(
  formData: FormData,
): Promise<FeaturedActionResult> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "settings.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const raw = formData.get("config");
  let json: unknown;
  try {
    json = JSON.parse(typeof raw === "string" ? raw : "");
  } catch {
    return { ok: false, error: "Invalid input" };
  }

  const parsed = HeroConfigSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await upsertSetting(HERO_SETTING_KEYS.design, parsed.data.design);
  await upsertSetting(HERO_SETTING_KEYS.text, parsed.data.text);

  const productId = parsed.data.productId.trim();
  if (productId) {
    await upsertSetting(HERO_SETTING_KEYS.productId, productId);
  } else {
    await deleteSetting(HERO_SETTING_KEYS.productId);
  }

  revalidatePath("/products/featured");
  return { ok: true };
}
