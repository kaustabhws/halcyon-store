"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { syncProductToSearch } from "@/lib/search";

const MediaInput = z.object({
  productId: z.string().min(1),
  url: z.string().url(),
  cloudinaryId: z.string().optional().or(z.literal("")),
  altText: z.string().optional().or(z.literal("")),
  /** Optional variant ID — when set, the image is tied to a specific variant. */
  variantId: z.string().optional().or(z.literal("")),
});

export async function addProductMediaAction(
  formData: FormData,
): Promise<{ ok: true; mediaId: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = MediaInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const variantId = parsed.data.variantId || null;
  if (variantId) {
    const variant = await prisma.variant.findFirst({
      where: { id: variantId, productId: parsed.data.productId, deletedAt: null },
    });
    if (!variant) return { ok: false, error: "Variant does not belong to this product" };
  }

  const count = await prisma.productMedia.count({
    where: { productId: parsed.data.productId },
  });

  const created = await prisma.productMedia.create({
    data: {
      productId: parsed.data.productId,
      variantId,
      url: parsed.data.url,
      cloudinaryId: parsed.data.cloudinaryId || null,
      altText: parsed.data.altText || null,
      position: count,
      isPrimary: count === 0,
    },
  });

  await syncProductToSearch(parsed.data.productId);

  revalidatePath(`/products/${parsed.data.productId}`);
  return { ok: true, mediaId: created.id };
}

const SetVariantInput = z.object({
  mediaId: z.string().min(1),
  variantId: z.string().optional().or(z.literal("")),
});

export async function setMediaVariantAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = SetVariantInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const media = await prisma.productMedia.findUnique({
    where: { id: parsed.data.mediaId },
  });
  if (!media) return { ok: false, error: "Media not found" };

  const variantId = parsed.data.variantId || null;
  if (variantId) {
    const variant = await prisma.variant.findFirst({
      where: { id: variantId, productId: media.productId, deletedAt: null },
    });
    if (!variant) return { ok: false, error: "Variant does not belong to this product" };
  }

  await prisma.productMedia.update({
    where: { id: media.id },
    data: { variantId },
  });

  await syncProductToSearch(media.productId);

  revalidatePath(`/products/${media.productId}`);
  return { ok: true };
}

const SetImageAttributeInput = z.object({
  productId: z.string().min(1),
  attributeId: z.string().optional().or(z.literal("")),
});

/**
 * Choose which attribute (e.g. Color) drives per-image grouping for a
 * product. Changing or clearing the attribute also clears any image→value
 * tags that no longer apply, so the admin never ends up with images tagged
 * to a value of an attribute that's no longer the image attribute.
 */
export async function setProductImageAttributeAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = SetImageAttributeInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const attributeId = parsed.data.attributeId || null;
  if (attributeId) {
    const attr = await prisma.attribute.findUnique({ where: { id: attributeId } });
    if (!attr) return { ok: false, error: "Attribute not found" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: parsed.data.productId },
      data: { imageAttributeId: attributeId },
    });
    // Drop image tags that reference a value outside the new image attribute.
    if (attributeId) {
      const validValues = await tx.attributeValue.findMany({
        where: { attributeId },
        select: { id: true },
      });
      const valid = new Set(validValues.map((v) => v.id));
      const tagged = await tx.productMedia.findMany({
        where: { productId: parsed.data.productId, attributeValueId: { not: null } },
        select: { id: true, attributeValueId: true },
      });
      for (const m of tagged) {
        if (m.attributeValueId && !valid.has(m.attributeValueId)) {
          await tx.productMedia.update({
            where: { id: m.id },
            data: { attributeValueId: null },
          });
        }
      }
    } else {
      // Clearing the attribute: untag everything.
      await tx.productMedia.updateMany({
        where: { productId: parsed.data.productId, attributeValueId: { not: null } },
        data: { attributeValueId: null },
      });
    }
  });

  await syncProductToSearch(parsed.data.productId);

  revalidatePath(`/products/${parsed.data.productId}`);
  return { ok: true };
}

const SetMediaValueInput = z.object({
  mediaId: z.string().min(1),
  attributeValueId: z.string().optional().or(z.literal("")),
});

/**
 * Tag a single image with an attribute value (e.g. assign this image to
 * Color = Black). Empty value = shared across all values.
 */
export async function setMediaAttributeValueAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = SetMediaValueInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const media = await prisma.productMedia.findUnique({
    where: { id: parsed.data.mediaId },
    include: { product: { select: { imageAttributeId: true } } },
  });
  if (!media) return { ok: false, error: "Media not found" };

  const attributeValueId = parsed.data.attributeValueId || null;
  if (attributeValueId) {
    // Guard: the value must belong to the product's chosen image attribute.
    const value = await prisma.attributeValue.findUnique({
      where: { id: attributeValueId },
      select: { attributeId: true },
    });
    if (!value || value.attributeId !== media.product.imageAttributeId) {
      return { ok: false, error: "Value does not belong to the image attribute" };
    }
  }

  await prisma.productMedia.update({
    where: { id: media.id },
    data: { attributeValueId },
  });

  await syncProductToSearch(media.productId);

  revalidatePath(`/products/${media.productId}`);
  return { ok: true };
}

const ToggleInput = z.object({
  productId: z.string().min(1),
  useVariantImages: z
    .union([z.literal("true"), z.literal("false"), z.literal("on"), z.literal("")])
    .optional(),
});

export async function toggleUseVariantImagesAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = ToggleInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const value = parsed.data.useVariantImages;
  const on = value === "true" || value === "on";

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, useVariantImages: true },
  });
  if (!product) return { ok: false, error: "Product not found" };

  await prisma.product.update({
    where: { id: product.id },
    data: { useVariantImages: on },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "product",
      entityId: product.id,
      action: "product.useVariantImages",
      before: { useVariantImages: product.useVariantImages } as never,
      after: { useVariantImages: on } as never,
    },
  });

  await syncProductToSearch(product.id);

  revalidatePath(`/products/${product.id}`);
  return { ok: true };
}

export async function deleteProductMediaAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const id = String(formData.get("mediaId") ?? "");
  if (!id) return { ok: false, error: "Invalid input" };

  const media = await prisma.productMedia.findUnique({ where: { id } });
  if (!media) return { ok: false, error: "Media not found" };

  await prisma.$transaction(async (tx) => {
    await tx.productMedia.delete({ where: { id } });
    if (media.isPrimary) {
      const next = await tx.productMedia.findFirst({
        where: { productId: media.productId },
        orderBy: { position: "asc" },
      });
      if (next) {
        await tx.productMedia.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }
  });

  await syncProductToSearch(media.productId);

  revalidatePath(`/products/${media.productId}`);
  return { ok: true };
}

export async function setPrimaryMediaAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }
  const id = String(formData.get("mediaId") ?? "");
  if (!id) return { ok: false, error: "Invalid input" };

  const media = await prisma.productMedia.findUnique({ where: { id } });
  if (!media) return { ok: false, error: "Media not found" };

  await prisma.$transaction(async (tx) => {
    await tx.productMedia.updateMany({
      where: { productId: media.productId, isPrimary: true },
      data: { isPrimary: false },
    });
    await tx.productMedia.update({
      where: { id },
      data: { isPrimary: true },
    });
  });

  await syncProductToSearch(media.productId);

  revalidatePath(`/products/${media.productId}`);
  return { ok: true };
}
