"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { syncProductToSearch } from "@/lib/search";

const VariantBase = z.object({
  productId: z.string().min(1),
  sku: z.string().trim().min(1, "Required"),
  name: z.string().trim().optional().or(z.literal("")),
  pricePaise: z.coerce.number().int().min(0, "Must be ≥ 0"),
  compareAtPaise: z.coerce.number().int().min(0).optional().or(z.nan()),
  onHand: z.coerce.number().int().min(0).default(0),
  isDefault: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional(),
  /** Comma-separated `attributeValue` IDs. */
  attributeValueIds: z.string().optional().or(z.literal("")),
});

const VariantUpdate = VariantBase.extend({ variantId: z.string().min(1) });

async function vendorId(): Promise<string> {
  const v = await prisma.vendor.findUniqueOrThrow({ where: { slug: "platform" } });
  return v.id;
}

async function defaultWarehouseId(vId: string): Promise<string> {
  const w = await prisma.warehouse.findFirstOrThrow({
    where: { vendorId: vId, isDefault: true, deletedAt: null },
  });
  return w.id;
}

async function defaultPriceListId(vId: string): Promise<string> {
  const pl = await prisma.priceList.findFirstOrThrow({
    where: { vendorId: vId, isDefault: true, deletedAt: null },
  });
  return pl.id;
}

function parseAttrValueIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

export async function createVariantAction(
  formData: FormData,
): Promise<{ ok: true; variantId: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = VariantBase.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error:
        Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Invalid input",
    };
  }
  const data = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) return { ok: false, error: "Product not found" };

  const skuClash = await prisma.variant.findFirst({
    where: { productId: product.id, sku: data.sku, deletedAt: null },
  });
  if (skuClash) return { ok: false, error: "SKU already in use on this product" };

  const vId = await vendorId();
  const [warehouseId, priceListId] = await Promise.all([
    defaultWarehouseId(vId),
    defaultPriceListId(vId),
  ]);

  const attrValueIds = parseAttrValueIds(data.attributeValueIds);
  const isFirst = (await prisma.variant.count({
    where: { productId: product.id, deletedAt: null },
  })) === 0;
  const wantsDefault = data.isDefault === "on" || data.isDefault === "true" || isFirst;

  const variantId = await prisma.$transaction(async (tx) => {
    if (wantsDefault) {
      await tx.variant.updateMany({
        where: { productId: product.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const variant = await tx.variant.create({
      data: {
        productId: product.id,
        sku: data.sku,
        name: data.name || null,
        isDefault: wantsDefault,
      },
    });

    if (wantsDefault) {
      await tx.product.update({
        where: { id: product.id },
        data: { defaultVariantId: variant.id, hasVariants: true },
      });
    } else {
      await tx.product.update({
        where: { id: product.id },
        data: { hasVariants: true },
      });
    }

    for (const valueId of attrValueIds) {
      await tx.variantAttributeValue.create({
        data: { variantId: variant.id, attributeValueId: valueId },
      });
    }

    await tx.price.create({
      data: {
        priceListId,
        variantId: variant.id,
        amountMinor: BigInt(data.pricePaise),
        compareAtAmountMinor:
          data.compareAtPaise && !Number.isNaN(data.compareAtPaise)
            ? BigInt(data.compareAtPaise)
            : null,
        currency: "INR",
      },
    });

    await tx.inventoryLevel.create({
      data: { warehouseId, variantId: variant.id, onHand: data.onHand },
    });

    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "variant",
        entityId: variant.id,
        action: "variant.create",
        after: { sku: variant.sku, name: variant.name } as never,
      },
    });

    return variant.id;
  });

  await syncProductToSearch(product.id);

  revalidatePath(`/products/${product.id}`);
  return { ok: true, variantId };
}

export async function updateVariantAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = VariantUpdate.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error:
        Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ?? "Invalid input",
    };
  }
  const data = parsed.data;

  const variant = await prisma.variant.findFirst({
    where: { id: data.variantId, deletedAt: null },
    include: {
      product: { select: { id: true, defaultVariantId: true } },
      prices: { take: 1, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!variant || variant.productId !== data.productId) {
    return { ok: false, error: "Variant not found" };
  }

  if (variant.sku !== data.sku) {
    const clash = await prisma.variant.findFirst({
      where: {
        productId: variant.productId,
        sku: data.sku,
        deletedAt: null,
        NOT: { id: variant.id },
      },
    });
    if (clash) return { ok: false, error: "SKU already in use on this product" };
  }

  const attrValueIds = parseAttrValueIds(data.attributeValueIds);
  const wantsDefault = data.isDefault === "on" || data.isDefault === "true";

  await prisma.$transaction(async (tx) => {
    if (wantsDefault && !variant.isDefault) {
      await tx.variant.updateMany({
        where: { productId: variant.productId, isDefault: true },
        data: { isDefault: false },
      });
      await tx.product.update({
        where: { id: variant.productId },
        data: { defaultVariantId: variant.id },
      });
    }

    await tx.variant.update({
      where: { id: variant.id },
      data: {
        sku: data.sku,
        name: data.name || null,
        isDefault: wantsDefault,
      },
    });

    // Replace attributes
    await tx.variantAttributeValue.deleteMany({ where: { variantId: variant.id } });
    for (const valueId of attrValueIds) {
      await tx.variantAttributeValue.create({
        data: { variantId: variant.id, attributeValueId: valueId },
      });
    }

    // Update price (upsert)
    const price = variant.prices[0];
    if (price) {
      await tx.price.update({
        where: { id: price.id },
        data: {
          amountMinor: BigInt(data.pricePaise),
          compareAtAmountMinor:
            data.compareAtPaise && !Number.isNaN(data.compareAtPaise)
              ? BigInt(data.compareAtPaise)
              : null,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "variant",
        entityId: variant.id,
        action: "variant.update",
        before: { sku: variant.sku, name: variant.name } as never,
        after: { sku: data.sku, name: data.name || null } as never,
      },
    });
  });

  await syncProductToSearch(variant.productId);

  revalidatePath(`/products/${variant.productId}`);
  return { ok: true };
}

export async function deleteVariantAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const variantId = String(formData.get("variantId") ?? "");
  if (!variantId) return { ok: false, error: "Invalid input" };

  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
    include: { product: { select: { id: true, defaultVariantId: true } } },
  });
  if (!variant) return { ok: false, error: "Variant not found" };

  const inUseOrders = await prisma.orderItem.count({ where: { variantId } });
  const inCarts = await prisma.cartItem.count({ where: { variantId } });
  if (inUseOrders + inCarts > 0) {
    return {
      ok: false,
      error: `Variant referenced by ${inUseOrders} orders / ${inCarts} carts. Archive the product instead.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    // Clear default pointer first to avoid FK lockup
    if (variant.product.defaultVariantId === variant.id) {
      await tx.product.update({
        where: { id: variant.productId },
        data: { defaultVariantId: null },
      });
    }
    await tx.variantAttributeValue.deleteMany({ where: { variantId: variant.id } });
    await tx.price.deleteMany({ where: { variantId: variant.id } });
    await tx.inventoryLevel.deleteMany({ where: { variantId: variant.id } });
    await tx.variant.delete({ where: { id: variant.id } });

    // If this was the default and other variants remain, promote one
    const remaining = await tx.variant.findFirst({
      where: { productId: variant.productId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (remaining) {
      await tx.variant.update({
        where: { id: remaining.id },
        data: { isDefault: true },
      });
      await tx.product.update({
        where: { id: variant.productId },
        data: { defaultVariantId: remaining.id },
      });
    } else {
      await tx.product.update({
        where: { id: variant.productId },
        data: { hasVariants: false },
      });
    }

    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "variant",
        entityId: variant.id,
        action: "variant.delete",
      },
    });
  });

  await syncProductToSearch(variant.productId);

  revalidatePath(`/products/${variant.productId}`);
  return { ok: true };
}
