"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AddressFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const AddAddressSchema = z.object({
  fullName: z.string().trim().min(1, "Required"),
  phone: z.string().trim().min(7, "Min 7 digits").max(20, "Max 20 digits").optional().or(z.literal("")),
  line1: z.string().trim().min(1, "Required"),
  line2: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().min(1, "Required"),
  state: z.string().trim().min(1, "Required"),
  postalCode: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
});

const DeleteAddressSchema = z.object({
  id: z.string().min(1, "Required"),
});

/**
 * Server action for creating an address from the /account/addresses form.
 * Returns a typed state object so the client form can render per-field
 * errors via useActionState.
 */
export async function addAddressAction(
  _prev: AddressFormState | undefined,
  formData: FormData,
): Promise<AddressFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sign in to manage addresses." };
  }

  const parsed = AddAddressSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.address.count({
    where: { customerId: session.user.id, deletedAt: null },
  });

  await prisma.address.create({
    data: {
      customerId: session.user.id,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      line1: parsed.data.line1,
      line2: parsed.data.line2 || null,
      city: parsed.data.city,
      state: parsed.data.state,
      postalCode: parsed.data.postalCode,
      country: "IN",
      isDefault: existing === 0,
    },
  });

  revalidatePath("/account/addresses");
  return { ok: true };
}

/**
 * Soft-delete an address belonging to the signed-in customer. Validates the
 * id with zod and confirms ownership before touching the row.
 */
export async function deleteAddressAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const parsed = DeleteAddressSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;

  // Ownership check — never trust the form id alone.
  const owned = await prisma.address.findFirst({
    where: { id: parsed.data.id, customerId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!owned) return;

  await prisma.address.update({
    where: { id: owned.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/account/addresses");
}
