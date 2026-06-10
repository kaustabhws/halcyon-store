"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

const SlugRegex = /^[a-z0-9-]+$/;

const BrandInput = z.object({
  name: z.string().trim().min(1, "Required"),
  slug: z.string().trim().min(1).regex(SlugRegex, "Lowercase letters, numbers and dashes only"),
  description: z.string().trim().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

const BrandUpdateInput = BrandInput.extend({ brandId: z.string().min(1) });

export type BrandFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
};

async function vendorId(): Promise<string> {
  const v = await prisma.vendor.findUniqueOrThrow({ where: { slug: "platform" } });
  return v.id;
}

export async function createBrandAction(
  _prev: BrandFormState | undefined,
  formData: FormData,
): Promise<BrandFormState> {
  const admin = await requireAdmin();
  const parsed = BrandInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const vId = await vendorId();
  const clash = await prisma.brand.findFirst({
    where: { vendorId: vId, slug: parsed.data.slug, deletedAt: null },
  });
  if (clash) return { fieldErrors: { slug: ["Slug already in use"] } };

  const created = await prisma.brand.create({
    data: {
      vendorId: vId,
      slug: parsed.data.slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      logoUrl: parsed.data.logoUrl || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "brand",
      entityId: created.id,
      action: "brand.create",
      after: { name: created.name } as never,
    },
  });

  revalidatePath("/brands");
  redirect("/brands");
}

export async function updateBrandAction(
  _prev: BrandFormState | undefined,
  formData: FormData,
): Promise<BrandFormState> {
  const admin = await requireAdmin();
  const parsed = BrandUpdateInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const vId = await vendorId();
  const existing = await prisma.brand.findFirst({
    where: { id: parsed.data.brandId, vendorId: vId },
  });
  if (!existing) return { error: "Brand not found" };

  if (existing.slug !== parsed.data.slug) {
    const clash = await prisma.brand.findFirst({
      where: {
        vendorId: vId,
        slug: parsed.data.slug,
        deletedAt: null,
        NOT: { id: existing.id },
      },
    });
    if (clash) return { fieldErrors: { slug: ["Slug already in use"] } };
  }

  await prisma.brand.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      logoUrl: parsed.data.logoUrl || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "brand",
      entityId: existing.id,
      action: "brand.update",
    },
  });

  revalidatePath("/brands");
  return { ok: true };
}

export async function deleteBrandAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const id = String(formData.get("brandId") ?? "");
  if (!id) return { ok: false, error: "Invalid input" };

  const inUse = await prisma.product.count({ where: { brandId: id, deletedAt: null } });
  if (inUse > 0) {
    return { ok: false, error: `Used by ${inUse} ${inUse === 1 ? "product" : "products"}` };
  }

  await prisma.brand.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "brand",
      entityId: id,
      action: "brand.delete",
    },
  });

  revalidatePath("/brands");
  return { ok: true };
}
