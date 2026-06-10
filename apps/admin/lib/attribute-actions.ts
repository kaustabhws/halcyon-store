"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";

const CodeRegex = /^[a-z0-9-]+$/;
const HexRegex = /^#[0-9a-fA-F]{6}$/;

const AttributeBase = z.object({
  code: z.string().trim().min(1).regex(CodeRegex, "Lowercase letters, numbers and dashes only"),
  label: z.string().trim().min(1, "Required"),
  kind: z.enum(["LIST", "TEXT", "NUMBER", "SWATCH"]),
});

const AttributeUpdate = AttributeBase.extend({ attributeId: z.string().min(1) });

export type AttributeFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
};

async function vendorId(): Promise<string> {
  const v = await prisma.vendor.findUniqueOrThrow({ where: { slug: "platform" } });
  return v.id;
}

export async function createAttributeAction(
  _prev: AttributeFormState | undefined,
  formData: FormData,
): Promise<AttributeFormState> {
  const admin = await requireAdmin();
  const parsed = AttributeBase.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const vId = await vendorId();
  const clash = await prisma.attribute.findUnique({
    where: { vendorId_code: { vendorId: vId, code: parsed.data.code } },
  });
  if (clash) return { fieldErrors: { code: ["Code already in use"] } };

  const created = await prisma.attribute.create({
    data: {
      vendorId: vId,
      code: parsed.data.code,
      label: parsed.data.label,
      kind: parsed.data.kind,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "attribute",
      entityId: created.id,
      action: "attribute.create",
      after: { code: created.code, label: created.label, kind: created.kind } as never,
    },
  });

  revalidatePath("/attributes");
  redirect(`/attributes/${created.id}/edit`);
}

export async function updateAttributeAction(
  _prev: AttributeFormState | undefined,
  formData: FormData,
): Promise<AttributeFormState> {
  const admin = await requireAdmin();
  const parsed = AttributeUpdate.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const vId = await vendorId();
  const existing = await prisma.attribute.findFirst({
    where: { id: parsed.data.attributeId, vendorId: vId },
  });
  if (!existing) return { error: "Attribute not found" };

  if (existing.code !== parsed.data.code) {
    const clash = await prisma.attribute.findUnique({
      where: { vendorId_code: { vendorId: vId, code: parsed.data.code } },
    });
    if (clash) return { fieldErrors: { code: ["Code already in use"] } };
  }

  await prisma.attribute.update({
    where: { id: existing.id },
    data: { code: parsed.data.code, label: parsed.data.label, kind: parsed.data.kind },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "attribute",
      entityId: existing.id,
      action: "attribute.update",
    },
  });

  revalidatePath("/attributes");
  revalidatePath(`/attributes/${existing.id}/edit`);
  return { ok: true };
}

export async function deleteAttributeAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const id = String(formData.get("attributeId") ?? "");
  if (!id) return { ok: false, error: "Invalid input" };

  const inUse = await prisma.variantAttributeValue.count({
    where: { attributeValue: { attributeId: id } },
  });
  if (inUse > 0) {
    return { ok: false, error: `Used by ${inUse} ${inUse === 1 ? "variant" : "variants"}` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.attributeValue.deleteMany({ where: { attributeId: id } });
    await tx.attribute.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "attribute",
        entityId: id,
        action: "attribute.delete",
      },
    });
  });

  revalidatePath("/attributes");
  return { ok: true };
}

const ValueInput = z.object({
  attributeId: z.string().min(1),
  value: z.string().trim().min(1).regex(CodeRegex, "Lowercase letters, numbers and dashes only"),
  label: z.string().trim().min(1, "Required"),
  swatchHex: z.string().trim().optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).default(0),
});

export async function addAttributeValueAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string; field?: string }> {
  const admin = await requireAdmin();
  const parsed = ValueInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const firstKey = Object.keys(flat)[0];
    return {
      ok: false,
      error: firstKey ? flat[firstKey as keyof typeof flat]?.[0] ?? "Invalid input" : "Invalid input",
      field: firstKey,
    };
  }
  if (parsed.data.swatchHex && !HexRegex.test(parsed.data.swatchHex)) {
    return { ok: false, error: "Hex must look like #RRGGBB", field: "swatchHex" };
  }

  const clash = await prisma.attributeValue.findUnique({
    where: {
      attributeId_value: {
        attributeId: parsed.data.attributeId,
        value: parsed.data.value,
      },
    },
  });
  if (clash) return { ok: false, error: "Value already exists", field: "value" };

  const created = await prisma.attributeValue.create({
    data: {
      attributeId: parsed.data.attributeId,
      value: parsed.data.value,
      label: parsed.data.label,
      swatchHex: parsed.data.swatchHex || null,
      position: parsed.data.position,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "attribute_value",
      entityId: created.id,
      action: "attribute_value.create",
      after: { value: created.value, label: created.label } as never,
    },
  });

  revalidatePath(`/attributes/${parsed.data.attributeId}/edit`);
  return { ok: true };
}

export async function deleteAttributeValueAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const id = String(formData.get("valueId") ?? "");
  if (!id) return { ok: false, error: "Invalid input" };

  const inUse = await prisma.variantAttributeValue.count({
    where: { attributeValueId: id },
  });
  if (inUse > 0) {
    return { ok: false, error: `Used by ${inUse} ${inUse === 1 ? "variant" : "variants"}` };
  }

  await prisma.$transaction(async (tx) => {
    const v = await tx.attributeValue.findUniqueOrThrow({ where: { id } });
    await tx.attributeValue.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "attribute_value",
        entityId: id,
        action: "attribute_value.delete",
        before: { value: v.value, label: v.label } as never,
      },
    });
  });

  revalidatePath("/attributes");
  return { ok: true };
}

/**
 * Shape returned by the quick-create actions below. Mirrors the
 * `AttributeOption` / value shape used by the variant builder so the client
 * can splice the result into local state without a page reload.
 */
export type QuickAttribute = {
  id: string;
  code: string;
  label: string;
  kind: "LIST" | "TEXT" | "NUMBER" | "SWATCH";
  values: Array<{
    id: string;
    value: string;
    label: string;
    swatchHex: string | null;
  }>;
};

export type QuickValue = {
  id: string;
  value: string;
  label: string;
  swatchHex: string | null;
};

function slugifyCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const QuickAttributeInput = z.object({
  label: z.string().trim().min(1, "Required"),
  kind: z.enum(["LIST", "TEXT", "NUMBER", "SWATCH"]).default("LIST"),
});

/**
 * Create an attribute inline from the variant builder. Unlike
 * createAttributeAction, this derives the code from the label, returns the
 * created record (no redirect), and is safe to call mid-form.
 */
export async function quickCreateAttributeAction(
  formData: FormData,
): Promise<{ ok: true; attribute: QuickAttribute } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = QuickAttributeInput.safeParse({
    label: formData.get("label"),
    kind: formData.get("kind") ?? "LIST",
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a name for the attribute" };
  }

  const vId = await vendorId();
  const baseCode = slugifyCode(parsed.data.label) || "attr";

  // Resolve code collisions by appending a numeric suffix.
  let code = baseCode;
  let n = 1;
  while (
    await prisma.attribute.findUnique({
      where: { vendorId_code: { vendorId: vId, code } },
    })
  ) {
    n += 1;
    code = `${baseCode}-${n}`;
  }

  const created = await prisma.attribute.create({
    data: { vendorId: vId, code, label: parsed.data.label, kind: parsed.data.kind },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "attribute",
      entityId: created.id,
      action: "attribute.create",
      after: { code: created.code, label: created.label, kind: created.kind } as never,
    },
  });

  revalidatePath("/attributes");
  return {
    ok: true,
    attribute: {
      id: created.id,
      code: created.code,
      label: created.label,
      kind: created.kind as QuickAttribute["kind"],
      values: [],
    },
  };
}

const QuickValueInput = z.object({
  attributeId: z.string().min(1),
  label: z.string().trim().min(1, "Required"),
  swatchHex: z.string().trim().optional().or(z.literal("")),
});

/**
 * Create an attribute value inline from the variant builder. Derives the
 * `value` slug from the label and returns the created record.
 */
export async function quickCreateValueAction(
  formData: FormData,
): Promise<{ ok: true; value: QuickValue } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "product.update");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = QuickValueInput.safeParse({
    attributeId: formData.get("attributeId"),
    label: formData.get("label"),
    swatchHex: formData.get("swatchHex") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Enter a value" };

  if (parsed.data.swatchHex && !HexRegex.test(parsed.data.swatchHex)) {
    return { ok: false, error: "Hex must look like #RRGGBB" };
  }

  const baseValue = slugifyCode(parsed.data.label) || "val";
  let value = baseValue;
  let n = 1;
  while (
    await prisma.attributeValue.findUnique({
      where: {
        attributeId_value: { attributeId: parsed.data.attributeId, value },
      },
    })
  ) {
    n += 1;
    value = `${baseValue}-${n}`;
  }

  const maxPos = await prisma.attributeValue.aggregate({
    where: { attributeId: parsed.data.attributeId },
    _max: { position: true },
  });

  const created = await prisma.attributeValue.create({
    data: {
      attributeId: parsed.data.attributeId,
      value,
      label: parsed.data.label,
      swatchHex: parsed.data.swatchHex || null,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  revalidatePath("/attributes");
  return {
    ok: true,
    value: {
      id: created.id,
      value: created.value,
      label: created.label,
      swatchHex: created.swatchHex,
    },
  };
}
