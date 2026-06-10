"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().min(10, "At least 10 characters").max(2000),
});

export type ReviewFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Submit a review for a product. The customer must have purchased it
 * (any non-failed, non-cancelled order line for any variant of that product)
 * to be eligible. Reviews start in PENDING and become public after admin
 * approval.
 *
 * If the customer already reviewed the product, we update in place rather
 * than creating a duplicate — the unique index (productId, customerId)
 * enforces this.
 */
export async function submitReviewAction(
  _prev: ReviewFormState | undefined,
  formData: FormData,
): Promise<ReviewFormState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sign in to review" };

  const parsed = ReviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const customerId = session.user.id;
  const { productId, rating, title, body } = parsed.data;

  // Verified-purchase check: find any order item by this customer for any
  // variant of this product.
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      order: {
        customerId,
        status: { notIn: ["FAILED", "CANCELLED"] },
      },
      variant: { productId },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!orderItem) {
    return {
      error:
        "We can only accept reviews from customers who've purchased this product.",
    };
  }

  await prisma.review.upsert({
    where: { productId_customerId: { productId, customerId } },
    update: {
      rating,
      title: title || null,
      body,
      status: "PENDING",
    },
    create: {
      productId,
      customerId,
      orderItemId: orderItem.id,
      rating,
      title: title || null,
      body,
      status: "PENDING",
    },
  });

  revalidatePath(`/product/${productId}`);
  return { ok: true };
}
