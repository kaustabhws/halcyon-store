"use server";

import { productRepo, type ProductDetailView } from "@/lib/db";

/**
 * Lazily fetch the detail needed to render the Quick View modal. Called from
 * the product card on demand so list pages don't pay for full variant data
 * up front. Returns null if the product is missing / inactive.
 */
export async function getQuickViewAction(
  slug: string,
): Promise<ProductDetailView | null> {
  if (!slug) return null;
  return productRepo.getProductBySlug(slug);
}
