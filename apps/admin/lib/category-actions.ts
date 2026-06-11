"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

const SlugRegex = /^[a-z0-9-]+$/;

const CategoryInput = z.object({
  name: z.string().trim().min(1, "Required"),
  slug: z.string().trim().min(1).regex(SlugRegex, "Lowercase letters, numbers and dashes only"),
  description: z.string().trim().optional().or(z.literal("")),
  imageUrl: z.string().url("An image is required"),
  parentId: z.string().optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).default(0),
});

const CategoryUpdateInput = CategoryInput.extend({
  categoryId: z.string().min(1),
});

export type CategoryFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
};

async function vendorId(): Promise<string> {
  const v = await prisma.vendor.findUniqueOrThrow({ where: { slug: "platform" } });
  return v.id;
}

/**
 * Resolve + validate a chosen parent for the 2-level category tree.
 * Returns the parentId to persist, or a field error. Rules: parent must
 * exist in this vendor, be a root (no grandparents), and not be the
 * category itself.
 */
async function resolveParent(
  vId: string,
  rawParentId: string | undefined,
  selfId: string | null,
): Promise<{ parentId: string | null } | { fieldError: string }> {
  const parentId = (rawParentId ?? "").trim();
  if (!parentId) return { parentId: null };
  if (selfId && parentId === selfId) {
    return { fieldError: "A category can't be its own parent" };
  }
  const parent = await prisma.category.findFirst({
    where: { id: parentId, vendorId: vId, deletedAt: null },
    select: { id: true, parentId: true },
  });
  if (!parent) return { fieldError: "Parent category not found" };
  if (parent.parentId) {
    return { fieldError: "Pick a top-level category as the parent (max 2 levels)" };
  }
  return { parentId };
}


export async function createCategoryAction(
  _prev: CategoryFormState | undefined,
  formData: FormData,
): Promise<CategoryFormState> {
  const admin = await requireAdmin();
  const parsed = CategoryInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const vId = await vendorId();
  const clash = await prisma.category.findFirst({
    where: { vendorId: vId, slug: parsed.data.slug, deletedAt: null },
  });
  if (clash) return { fieldErrors: { slug: ["Slug already in use"] } };

  const parent = await resolveParent(vId, parsed.data.parentId, null);
  if ("fieldError" in parent) {
    return { fieldErrors: { parentId: [parent.fieldError] } };
  }

  const created = await prisma.category.create({
    data: {
      vendorId: vId,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      parentId: parent.parentId,
      position: parsed.data.position,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "category",
      entityId: created.id,
      action: "category.create",
      after: { name: created.name, slug: created.slug } as never,
    },
  });

  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategoryAction(
  _prev: CategoryFormState | undefined,
  formData: FormData,
): Promise<CategoryFormState> {
  const admin = await requireAdmin();
  const parsed = CategoryUpdateInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const vId = await vendorId();
  const existing = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, vendorId: vId },
  });
  if (!existing) return { error: "Category not found" };

  if (existing.slug !== parsed.data.slug) {
    const clash = await prisma.category.findFirst({
      where: {
        vendorId: vId,
        slug: parsed.data.slug,
        deletedAt: null,
        NOT: { id: existing.id },
      },
    });
    if (clash) return { fieldErrors: { slug: ["Slug already in use"] } };
  }

  const parent = await resolveParent(vId, parsed.data.parentId, existing.id);
  if ("fieldError" in parent) {
    return { fieldErrors: { parentId: [parent.fieldError] } };
  }
  // A category that already has children can't itself become a child
  // (that would create a 3rd level).
  if (parent.parentId) {
    const childCount = await prisma.category.count({
      where: { parentId: existing.id, deletedAt: null },
    });
    if (childCount > 0) {
      return {
        fieldErrors: {
          parentId: ["This category has sub-categories, so it can't become a sub-category itself"],
        },
      };
    }
  }

  await prisma.category.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      parentId: parent.parentId,
      position: parsed.data.position,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "category",
      entityId: existing.id,
      action: "category.update",
      before: { name: existing.name, slug: existing.slug } as never,
      after: { name: parsed.data.name, slug: parsed.data.slug } as never,
    },
  });

  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteCategoryAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const id = String(formData.get("categoryId") ?? "");
  if (!id) return { ok: false, error: "Invalid input" };

  const inUse = await prisma.productCategory.count({ where: { categoryId: id } });
  if (inUse > 0) {
    return { ok: false, error: `Used by ${inUse} ${inUse === 1 ? "product" : "products"}` };
  }

  await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "category",
      entityId: id,
      action: "category.delete",
    },
  });

  revalidatePath("/categories");
  return { ok: true };
}
