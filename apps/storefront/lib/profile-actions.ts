"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ProfileFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const ProfileSchema = z.object({
  firstName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d\s\-()]*$/, "Digits, spaces, +, -, () only")
    .optional()
    .or(z.literal("")),
  marketingOptIn: z
    .union([z.literal("on"), z.literal("true"), z.literal("")])
    .optional(),
});

export async function updateProfileAction(
  _prev: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const parsed = ProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    marketingOptIn: formData.get("marketingOptIn"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.customer.update({
    where: { id: session.user.id },
    data: {
      firstName: parsed.data.firstName || null,
      lastName: parsed.data.lastName || null,
      phone: parsed.data.phone || null,
      marketingOptIn:
        parsed.data.marketingOptIn === "on" ||
        parsed.data.marketingOptIn === "true",
    },
  });

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { ok: true };
}

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[a-zA-Z]/, "Must contain a letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Doesn't match",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prev: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const parsed = PasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  // Customers signed in via Google OAuth have no password — direct them
  // to set one via the future password-reset flow rather than failing
  // with a misleading "incorrect" message.
  if (!customer.passwordHash) {
    return {
      error:
        "This account uses Google sign-in. Password changes aren't available yet for OAuth-only accounts.",
    };
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, customer.passwordHash);
  if (!ok) {
    return { fieldErrors: { currentPassword: ["Incorrect password"] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.customer.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  revalidatePath("/account/profile");
  return { ok: true };
}
