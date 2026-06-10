"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { wishlistRepo } from "@/lib/db";

const Input = z.object({ productId: z.string().min(1) });

export type WishlistResult =
  | { ok: true; inWishlist: boolean }
  | { ok: false; error: string };

export async function toggleWishlistAction(
  formData: FormData,
): Promise<WishlistResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to save items" };
  }

  const parsed = Input.safeParse({ productId: formData.get("productId") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const customerId = session.user.id;
  const exists = await wishlistRepo.isInWishlist(customerId, parsed.data.productId);
  if (exists) {
    await wishlistRepo.removeFromWishlist(customerId, parsed.data.productId);
    revalidatePath("/account/wishlist");
    return { ok: true, inWishlist: false };
  }
  await wishlistRepo.addToWishlist(customerId, parsed.data.productId);
  revalidatePath("/account/wishlist");
  return { ok: true, inWishlist: true };
}
