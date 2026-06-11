"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { NAV_MODES, NAV_SETTING_KEY, SIMPLE_MAX_ITEMS } from "@ecom/shared/nav";

export type NavActionResult = { ok: true } | { ok: false; error: string };

const NavConfigSchema = z.object({
  mode: z.enum(NAV_MODES),
  items: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        label: z.string().trim().max(40).optional().default(""),
        childIds: z.array(z.string().min(1)).optional().default([]),
      }),
    )
    .max(50),
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

/**
 * Persist the storefront navigation config. Validates every referenced
 * category against the live tree: items must point at existing categories,
 * simple mode is capped + flattened, and mega children must really be
 * children of their item's category.
 */
export async function setNavConfigAction(
  formData: FormData,
): Promise<NavActionResult> {
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

  const parsed = NavConfigSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  // Resolve the live tree to validate references.
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, children: { select: { id: true } } },
  });
  const rootIds = new Set(roots.map((r) => r.id));
  const childrenByParent = new Map(
    roots.map((r) => [r.id, new Set(r.children.map((c) => c.id))]),
  );
  const allIds = new Set<string>();
  for (const r of roots) {
    allIds.add(r.id);
    for (const c of r.children) allIds.add(c.id);
  }

  const isSimple = parsed.data.mode === "simple";
  const rawItems = isSimple
    ? parsed.data.items.slice(0, SIMPLE_MAX_ITEMS)
    : parsed.data.items;

  const cleanItems = [];
  for (const item of rawItems) {
    if (!allIds.has(item.categoryId)) {
      return { ok: false, error: "A selected category no longer exists" };
    }
    const label = item.label?.trim() || undefined;

    let childIds: string[] | undefined;
    if (!isSimple && item.childIds.length > 0) {
      // Children must be real children of this (root) category.
      const allowed = childrenByParent.get(item.categoryId);
      if (!allowed || !rootIds.has(item.categoryId)) {
        return {
          ok: false,
          error: "Only top-level categories can have dropdown items",
        };
      }
      childIds = item.childIds.filter((id) => allowed.has(id));
    }

    cleanItems.push({
      categoryId: item.categoryId,
      ...(label ? { label } : {}),
      ...(childIds && childIds.length > 0 ? { childIds } : {}),
    });
  }

  await upsertSetting(NAV_SETTING_KEY, {
    mode: parsed.data.mode,
    items: cleanItems,
  });

  revalidatePath("/navigation");
  return { ok: true };
}
