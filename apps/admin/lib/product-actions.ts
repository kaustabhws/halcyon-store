"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { syncProductToSearch } from "@/lib/search";

/**
 * The matrix builder lets admin pick one or more attributes (Color, Size...)
 * and a subset of values for each, then generates the Cartesian product of
 * variants. e.g. Color = {Black, White} × Size = {S, M, L} → 6 variants.
 *
 * `selections` maps attributeId → list of attributeValueIds the admin enabled.
 * `basePricePaise` is the default price for every variant; `overrides` is a
 * sparse object keyed by a stable "valueIdsJoined" key (sorted, joined by "|")
 * containing per-variant SKU/price/stock when the admin tweaked them inline.
 */
const MatrixOverride = z.object({
  sku: z.string().trim().min(1).optional(),
  pricePaise: z.coerce.number().int().min(0).optional(),
  compareAtPaise: z.coerce.number().int().min(0).optional().nullable(),
  onHand: z.coerce.number().int().min(0).optional(),
});

const MatrixInput = z.object({
  mode: z.literal("matrix"),
  skuPrefix: z.string().trim().min(1, "Required"),
  basePricePaise: z.coerce.number().int().min(0, "Must be ≥ 0"),
  baseCompareAtPaise: z.coerce.number().int().min(0).optional().nullable(),
  baseOnHand: z.coerce.number().int().min(0).default(0),
  selections: z.record(z.string(), z.array(z.string().min(1)).min(1)),
  overrides: z.record(z.string(), MatrixOverride).optional(),
});

const SingleInput = z.object({
  mode: z.literal("single"),
  sku: z.string().trim().min(1, "Required"),
  pricePaise: z.coerce.number().int().min(0, "Must be ≥ 0"),
  compareAtPaise: z.coerce.number().int().min(0).optional().nullable(),
  onHand: z.coerce.number().int().min(0).default(0),
});

const VariantPlanInput = z.discriminatedUnion("mode", [SingleInput, MatrixInput]);

const ProductBaseInput = z.object({
  name: z.string().trim().min(1, "Required"),
  slug: z
    .string()
    .trim()
    .min(1, "Required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  // `__none` is the sentinel from the Brand Select. Treat it as empty.
  brandId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "__none" || !v ? "" : v)),
  categoryId: z.string().trim().min(1, "Pick a category"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  kind: z.enum(["PHYSICAL", "DIGITAL", "SERVICE", "SUBSCRIPTION", "BUNDLE", "KIT", "COURSE"]),
  isFeatured: z
    .union([z.literal("on"), z.literal("true"), z.literal(""), z.literal(null)])
    .optional(),
  shortDescription: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
});

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
};

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

/**
 * Cartesian product of an object of arrays. Returns a list of selections
 * where each selection is { [attributeId]: attributeValueId }.
 */
function cartesian(
  selections: Record<string, string[]>,
): Array<Record<string, string>> {
  const entries = Object.entries(selections);
  if (entries.length === 0) return [];
  const out: Array<Record<string, string>> = [{}];
  for (const [attrId, valueIds] of entries) {
    const next: Array<Record<string, string>> = [];
    for (const acc of out) {
      for (const valueId of valueIds) {
        next.push({ ...acc, [attrId]: valueId });
      }
    }
    out.splice(0, out.length, ...next);
  }
  return out;
}

function rowKey(combo: Record<string, string>): string {
  return Object.values(combo).sort().join("|");
}

async function buildVariantDisplayName(
  attributeValueIds: string[],
): Promise<string | null> {
  if (attributeValueIds.length === 0) return null;
  const values = await prisma.attributeValue.findMany({
    where: { id: { in: attributeValueIds } },
    include: { attribute: true },
  });
  // Sort by attribute code for stable order
  values.sort((a, b) => a.attribute.code.localeCompare(b.attribute.code));
  return values.map((v) => v.label).join(" / ");
}

function parseVariantPlan(formData: FormData):
  | { ok: true; plan: z.infer<typeof VariantPlanInput> }
  | { ok: false; error: string } {
  const mode = formData.get("variantMode");
  if (mode === "matrix") {
    const raw = formData.get("variantPlan");
    if (typeof raw !== "string") return { ok: false, error: "Missing variant plan" };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Invalid variant plan JSON" };
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { mode?: unknown }).mode !== "matrix"
    ) {
      return { ok: false, error: "Invalid variant plan" };
    }
    const result = VariantPlanInput.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        error:
          Object.values(result.error.flatten().fieldErrors)[0]?.[0] ??
          "Invalid variant plan",
      };
    }
    return { ok: true, plan: result.data };
  }
  // Default: single variant from inline form fields
  const single = SingleInput.safeParse({
    mode: "single",
    sku: formData.get("sku"),
    pricePaise: formData.get("pricePaise"),
    compareAtPaise: formData.get("compareAtPaise") || null,
    onHand: formData.get("onHand"),
  });
  if (!single.success) {
    return {
      ok: false,
      error:
        Object.values(single.error.flatten().fieldErrors)[0]?.[0] ??
        "Invalid variant fields",
    };
  }
  return { ok: true, plan: single.data };
}

export async function createProductAction(
  _prev: ProductFormState | undefined,
  formData: FormData,
): Promise<ProductFormState> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.create");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Permission denied" };
  }

  const baseParsed = ProductBaseInput.safeParse(Object.fromEntries(formData));
  if (!baseParsed.success) return { fieldErrors: baseParsed.error.flatten().fieldErrors };
  const base = baseParsed.data;

  const variantParsed = parseVariantPlan(formData);
  if (!variantParsed.ok) return { error: variantParsed.error };
  const plan = variantParsed.plan;

  const vId = await vendorId();
  const slugClash = await prisma.product.findFirst({
    where: { vendorId: vId, slug: base.slug, deletedAt: null },
  });
  if (slugClash) return { fieldErrors: { slug: ["Slug already in use"] } };

  // Compute and pre-validate the list of variants to create.
  type PlannedVariant = {
    sku: string;
    pricePaise: number;
    compareAtPaise: number | null;
    onHand: number;
    attributeValueIds: string[];
    isDefault: boolean;
    displayName: string | null;
  };

  let planned: PlannedVariant[];
  if (plan.mode === "single") {
    planned = [
      {
        sku: plan.sku,
        pricePaise: plan.pricePaise,
        compareAtPaise: plan.compareAtPaise ?? null,
        onHand: plan.onHand,
        attributeValueIds: [],
        isDefault: true,
        displayName: null,
      },
    ];
  } else {
    const combos = cartesian(plan.selections);
    if (combos.length === 0) {
      return { error: "Pick at least one value for every attribute" };
    }
    if (combos.length > 100) {
      return { error: `Matrix produces ${combos.length} variants — keep it under 100.` };
    }

    // Build planned variants with stable, generated SKUs
    const allValueIds = Array.from(
      new Set(combos.flatMap((c) => Object.values(c))),
    );
    const valueRows = await prisma.attributeValue.findMany({
      where: { id: { in: allValueIds } },
      include: { attribute: true },
    });
    const byId = new Map(valueRows.map((v) => [v.id, v]));

    // Sanity: all value IDs resolved + belong to declared attribute
    for (const combo of combos) {
      for (const [attrId, valId] of Object.entries(combo)) {
        const v = byId.get(valId);
        if (!v || v.attributeId !== attrId) {
          return { error: "Invalid attribute/value combination" };
        }
      }
    }

    planned = combos.map((combo, idx) => {
      const ids = Object.values(combo);
      const key = rowKey(combo);
      const override = plan.overrides?.[key];
      const suffix = ids
        .map((id) => {
          const row = byId.get(id);
          return row?.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        })
        .filter(Boolean)
        .join("-");
      const sku =
        override?.sku?.trim() ||
        `${plan.skuPrefix.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${suffix || String(idx + 1)}`;
      // Stable display name from attribute labels
      const sortedValues = [...ids]
        .map((id) => byId.get(id)!)
        .sort((a, b) => a.attribute.code.localeCompare(b.attribute.code));
      const displayName = sortedValues.map((v) => v.label).join(" / ");

      return {
        sku,
        pricePaise: override?.pricePaise ?? plan.basePricePaise,
        compareAtPaise: override?.compareAtPaise ?? plan.baseCompareAtPaise ?? null,
        onHand: override?.onHand ?? plan.baseOnHand,
        attributeValueIds: ids,
        isDefault: idx === 0,
        displayName,
      };
    });

    // SKU duplicates within the planned list
    const skuSet = new Set<string>();
    for (const p of planned) {
      if (skuSet.has(p.sku)) {
        return { error: `Duplicate SKU "${p.sku}" generated. Tweak the prefix or override.` };
      }
      skuSet.add(p.sku);
    }
  }

  // Pre-check SKU clashes globally
  const skuClash = await prisma.variant.findFirst({
    where: { sku: { in: planned.map((p) => p.sku) }, deletedAt: null },
    select: { sku: true },
  });
  if (skuClash) {
    return { error: `SKU "${skuClash.sku}" already exists. Use a different prefix.` };
  }

  const [warehouseId, priceListId] = await Promise.all([
    defaultWarehouseId(vId),
    defaultPriceListId(vId),
  ]);

  const productId = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        vendorId: vId,
        slug: base.slug,
        name: base.name,
        kind: base.kind,
        status: base.status,
        brandId: base.brandId || null,
        isFeatured: base.isFeatured === "on" || base.isFeatured === "true",
        shortDescription: base.shortDescription || null,
        description: base.description || null,
        hasVariants: plan.mode === "matrix",
      },
    });

    await tx.productCategory.create({
      data: { productId: product.id, categoryId: base.categoryId, position: 0 },
    });

    let defaultVariantId: string | null = null;
    for (const v of planned) {
      const variant = await tx.variant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          name: v.displayName,
          isDefault: v.isDefault,
        },
      });
      if (v.isDefault) defaultVariantId = variant.id;

      for (const valueId of v.attributeValueIds) {
        await tx.variantAttributeValue.create({
          data: { variantId: variant.id, attributeValueId: valueId },
        });
      }

      await tx.price.create({
        data: {
          priceListId,
          variantId: variant.id,
          amountMinor: BigInt(v.pricePaise),
          compareAtAmountMinor:
            v.compareAtPaise != null ? BigInt(v.compareAtPaise) : null,
          currency: "INR",
        },
      });

      await tx.inventoryLevel.create({
        data: { warehouseId, variantId: variant.id, onHand: v.onHand },
      });
    }

    if (defaultVariantId) {
      await tx.product.update({
        where: { id: product.id },
        data: { defaultVariantId },
      });
    }

    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "product",
        entityId: product.id,
        action: "product.create",
        after: {
          name: base.name,
          slug: base.slug,
          status: base.status,
          variants: planned.length,
        } as never,
      },
    });

    return product.id;
  });

  await syncProductToSearch(productId);

  revalidatePath("/products");
  redirect(`/products/${productId}`);
}

const ProductUpdateInput = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  brandId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "__none" || !v ? "" : v)),
  categoryId: z.string().trim().min(1),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  kind: z.enum(["PHYSICAL", "DIGITAL", "SERVICE", "SUBSCRIPTION", "BUNDLE", "KIT", "COURSE"]),
  isFeatured: z
    .union([z.literal("on"), z.literal("true"), z.literal(""), z.literal(null)])
    .optional(),
  shortDescription: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
});

/**
 * Edit only the product fields (no variant editing here — variants are
 * managed on the detail page).
 */
export async function updateProductAction(
  _prev: ProductFormState | undefined,
  formData: FormData,
): Promise<ProductFormState> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = ProductUpdateInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;

  const vId = await vendorId();
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    include: { categories: true },
  });
  if (!product) return { error: "Product not found" };

  if (product.slug !== data.slug) {
    const clash = await prisma.product.findFirst({
      where: { vendorId: vId, slug: data.slug, deletedAt: null, NOT: { id: product.id } },
    });
    if (clash) return { fieldErrors: { slug: ["Slug already in use"] } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: {
        name: data.name,
        slug: data.slug,
        brandId: data.brandId || null,
        status: data.status,
        kind: data.kind,
        isFeatured: data.isFeatured === "on" || data.isFeatured === "true",
        shortDescription: data.shortDescription || null,
        description: data.description || null,
      },
    });

    await tx.productCategory.deleteMany({ where: { productId: product.id } });
    await tx.productCategory.create({
      data: { productId: product.id, categoryId: data.categoryId, position: 0 },
    });

    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "product",
        entityId: product.id,
        action: "product.update",
        before: { name: product.name, slug: product.slug, status: product.status } as never,
        after: { name: data.name, slug: data.slug, status: data.status } as never,
      },
    });
  });

  await syncProductToSearch(product.id);

  revalidatePath("/products");
  revalidatePath(`/products/${product.id}`);
  return { ok: true };
}

const ArchiveInput = z.object({ productId: z.string().min(1) });

export async function archiveProductAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.delete");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = ArchiveInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: parsed.data.productId },
      data: { status: "ARCHIVED", deletedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "product",
        entityId: parsed.data.productId,
        action: "product.archive",
      },
    });
  });

  // Sync after archive — the mapper will detect the deletedAt and emit a delete op.
  await syncProductToSearch(parsed.data.productId);

  revalidatePath("/products");
  return { ok: true };
}

/**
 * Bulk-add variants to an existing product. Used when admin wants to add
 * more sizes/colors later. Same matrix logic as create.
 */
const BulkVariantsInput = z.object({
  productId: z.string().min(1),
  skuPrefix: z.string().trim().min(1),
  basePricePaise: z.coerce.number().int().min(0),
  baseCompareAtPaise: z.coerce.number().int().min(0).optional().nullable(),
  baseOnHand: z.coerce.number().int().min(0).default(0),
  selections: z.record(z.string(), z.array(z.string().min(1)).min(1)),
  overrides: z.record(z.string(), MatrixOverride).optional(),
});

export async function bulkAddVariantsAction(
  formData: FormData,
): Promise<{ ok: true; created: number } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const raw = formData.get("plan");
  if (typeof raw !== "string") return { ok: false, error: "Missing plan" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid plan JSON" };
  }
  const result = BulkVariantsInput.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error:
        Object.values(result.error.flatten().fieldErrors)[0]?.[0] ??
        "Invalid plan",
    };
  }
  const plan = result.data;

  const product = await prisma.product.findUnique({
    where: { id: plan.productId },
    include: {
      variants: {
        where: { deletedAt: null },
        include: { attributes: true },
      },
    },
  });
  if (!product) return { ok: false, error: "Product not found" };

  const combos = cartesian(plan.selections);
  if (combos.length === 0) return { ok: false, error: "Pick values for every attribute" };
  if (combos.length > 100)
    return { ok: false, error: `Matrix produces ${combos.length} variants — keep it under 100.` };

  // Skip combos that already exist (same set of attribute value IDs)
  const existingSignatures = new Set(
    product.variants.map((v) =>
      [...v.attributes.map((a) => a.attributeValueId)].sort().join("|"),
    ),
  );

  const allValueIds = Array.from(new Set(combos.flatMap((c) => Object.values(c))));
  const valueRows = await prisma.attributeValue.findMany({
    where: { id: { in: allValueIds } },
    include: { attribute: true },
  });
  const byId = new Map(valueRows.map((v) => [v.id, v]));

  type PlannedVariant = {
    sku: string;
    pricePaise: number;
    compareAtPaise: number | null;
    onHand: number;
    attributeValueIds: string[];
    displayName: string;
  };

  const planned: PlannedVariant[] = [];
  for (let i = 0; i < combos.length; i++) {
    const combo = combos[i]!;
    const ids = Object.values(combo);
    const signature = [...ids].sort().join("|");
    if (existingSignatures.has(signature)) continue;

    const override = plan.overrides?.[rowKey(combo)];
    const suffix = ids
      .map((id) => byId.get(id)?.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
      .filter(Boolean)
      .join("-");
    const sku =
      override?.sku?.trim() ||
      `${plan.skuPrefix.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${suffix || String(i + 1)}`;
    const sortedValues = [...ids]
      .map((id) => byId.get(id)!)
      .sort((a, b) => a.attribute.code.localeCompare(b.attribute.code));
    const displayName = sortedValues.map((v) => v.label).join(" / ");

    planned.push({
      sku,
      pricePaise: override?.pricePaise ?? plan.basePricePaise,
      compareAtPaise: override?.compareAtPaise ?? plan.baseCompareAtPaise ?? null,
      onHand: override?.onHand ?? plan.baseOnHand,
      attributeValueIds: ids,
      displayName,
    });
  }

  if (planned.length === 0) {
    return { ok: false, error: "Every combination already exists for this product." };
  }

  const skuClash = await prisma.variant.findFirst({
    where: { sku: { in: planned.map((p) => p.sku) }, deletedAt: null },
    select: { sku: true },
  });
  if (skuClash) return { ok: false, error: `SKU "${skuClash.sku}" already exists` };

  const vId = await vendorId();
  const [warehouseId, priceListId] = await Promise.all([
    defaultWarehouseId(vId),
    defaultPriceListId(vId),
  ]);

  await prisma.$transaction(async (tx) => {
    for (const v of planned) {
      const created = await tx.variant.create({
        data: {
          productId: product.id,
          sku: v.sku,
          name: v.displayName,
          isDefault: false,
        },
      });
      for (const valueId of v.attributeValueIds) {
        await tx.variantAttributeValue.create({
          data: { variantId: created.id, attributeValueId: valueId },
        });
      }
      await tx.price.create({
        data: {
          priceListId,
          variantId: created.id,
          amountMinor: BigInt(v.pricePaise),
          compareAtAmountMinor:
            v.compareAtPaise != null ? BigInt(v.compareAtPaise) : null,
          currency: "INR",
        },
      });
      await tx.inventoryLevel.create({
        data: { warehouseId, variantId: created.id, onHand: v.onHand },
      });
    }

    if (!product.hasVariants) {
      await tx.product.update({
        where: { id: product.id },
        data: { hasVariants: true },
      });
    }

    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "product",
        entityId: product.id,
        action: "product.bulk_variants",
        after: { created: planned.length } as never,
      },
    });
  });

  await syncProductToSearch(product.id);

  revalidatePath(`/products/${product.id}`);
  return { ok: true, created: planned.length };
}
