"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { normalizeCode } from "@ecom/shared/coupons";

const CodeRegex = /^[A-Z0-9-]+$/;

const CouponBase = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .transform((v) => normalizeCode(v))
    .refine((v) => CodeRegex.test(v), {
      message: "Uppercase letters, digits and dashes only",
    }),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]),
  /** percent 0-100 OR amount in paise OR ignored for FREE_SHIPPING */
  value: z.coerce.number().int().min(0),
  minSubtotalPaise: z.coerce.number().int().min(0).optional().or(z.literal("")),
  maxRedemptions: z.coerce.number().int().min(1).optional().or(z.literal("")),
  perCustomerLimit: z.coerce.number().int().min(1).optional().or(z.literal("")),
  firstOrderOnly: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional(),
  validFrom: z.string().optional().or(z.literal("")),
  validTo: z.string().optional().or(z.literal("")),
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional(),
});

const CouponUpdate = CouponBase.extend({ couponId: z.string().min(1) });

export type CouponFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function vendorId(): Promise<string> {
  const v = await prisma.vendor.findUniqueOrThrow({
    where: { slug: "platform" },
  });
  return v.id;
}

function parseDate(input: string | undefined | ""): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function checkValueShape(
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING",
  value: number,
): string | null {
  if (type === "PERCENT") {
    if (value < 1 || value > 100) return "Percent must be 1–100";
  }
  if (type === "FIXED") {
    if (value < 1) return "Amount must be at least 1";
  }
  return null;
}

export async function createCouponAction(
  _prev: CouponFormState | undefined,
  formData: FormData,
): Promise<CouponFormState> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "coupon.create");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = CouponBase.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const valueErr = checkValueShape(data.type, data.value);
  if (valueErr) return { fieldErrors: { value: [valueErr] } };

  const vId = await vendorId();
  const clash = await prisma.coupon.findUnique({ where: { code: data.code } });
  if (clash) return { fieldErrors: { code: ["Code already in use"] } };

  const validFrom = parseDate(data.validFrom);
  const validTo = parseDate(data.validTo);
  if (validFrom && validTo && validFrom > validTo) {
    return { fieldErrors: { validTo: ["End must be after start"] } };
  }

  const created = await prisma.coupon.create({
    data: {
      vendorId: vId,
      code: data.code,
      type: data.type,
      value: data.value,
      currency: data.type === "FIXED" ? "INR" : null,
      scope: "CART",
      minSubtotalMinor:
        typeof data.minSubtotalPaise === "number"
          ? BigInt(data.minSubtotalPaise)
          : null,
      maxRedemptions:
        typeof data.maxRedemptions === "number" ? data.maxRedemptions : null,
      perCustomerLimit:
        typeof data.perCustomerLimit === "number"
          ? data.perCustomerLimit
          : null,
      firstOrderOnly: data.firstOrderOnly === "on" || data.firstOrderOnly === "true",
      validFrom,
      validTo,
      active: data.active === "on" || data.active === "true",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "coupon",
      entityId: created.id,
      action: "coupon.create",
      after: { code: created.code, type: created.type, value: created.value } as never,
    },
  });

  revalidatePath("/coupons");
  redirect("/coupons");
}

export async function updateCouponAction(
  _prev: CouponFormState | undefined,
  formData: FormData,
): Promise<CouponFormState> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "coupon.create");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Permission denied" };
  }

  const parsed = CouponUpdate.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const valueErr = checkValueShape(data.type, data.value);
  if (valueErr) return { fieldErrors: { value: [valueErr] } };

  const existing = await prisma.coupon.findUnique({
    where: { id: data.couponId },
  });
  if (!existing) return { error: "Coupon not found" };

  if (existing.code !== data.code) {
    const clash = await prisma.coupon.findUnique({
      where: { code: data.code },
    });
    if (clash) return { fieldErrors: { code: ["Code already in use"] } };
  }

  const validFrom = parseDate(data.validFrom);
  const validTo = parseDate(data.validTo);
  if (validFrom && validTo && validFrom > validTo) {
    return { fieldErrors: { validTo: ["End must be after start"] } };
  }

  await prisma.coupon.update({
    where: { id: existing.id },
    data: {
      code: data.code,
      type: data.type,
      value: data.value,
      currency: data.type === "FIXED" ? "INR" : null,
      minSubtotalMinor:
        typeof data.minSubtotalPaise === "number"
          ? BigInt(data.minSubtotalPaise)
          : null,
      maxRedemptions:
        typeof data.maxRedemptions === "number" ? data.maxRedemptions : null,
      perCustomerLimit:
        typeof data.perCustomerLimit === "number"
          ? data.perCustomerLimit
          : null,
      firstOrderOnly: data.firstOrderOnly === "on" || data.firstOrderOnly === "true",
      validFrom,
      validTo,
      active: data.active === "on" || data.active === "true",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorKind: "ADMIN",
      actorId: admin.adminId,
      entityType: "coupon",
      entityId: existing.id,
      action: "coupon.update",
    },
  });

  revalidatePath("/coupons");
  return { ok: true };
}

export async function deleteCouponAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    requirePermission(admin, "coupon.create");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Permission denied" };
  }

  const id = String(formData.get("couponId") ?? "");
  if (!id) return { ok: false, error: "Invalid input" };

  await prisma.$transaction(async (tx) => {
    await tx.coupon.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
    await tx.auditLog.create({
      data: {
        actorKind: "ADMIN",
        actorId: admin.adminId,
        entityType: "coupon",
        entityId: id,
        action: "coupon.delete",
      },
    });
  });

  revalidatePath("/coupons");
  return { ok: true };
}
