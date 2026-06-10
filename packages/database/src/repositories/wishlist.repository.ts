import { prisma } from "../client.ts";
import type { Prisma } from "../generated/index.js";

const wishlistInclude = {
  product: {
    include: {
      brand: true,
      media: { take: 1, orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
      variants: {
        where: { deletedAt: null },
        include: {
          prices: { take: 1, orderBy: { updatedAt: "desc" } },
          inventory: true,
        },
      },
    },
  },
} satisfies Prisma.WishlistItemInclude;

type WishlistItemRow = Prisma.WishlistItemGetPayload<{
  include: typeof wishlistInclude;
}>;

export type WishlistItemView = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  brandName: string | null;
  primaryImageUrl: string | null;
  priceMinor: bigint;
  compareAtMinor: bigint | null;
  currency: string;
  inStock: boolean;
  addedAt: Date;
};

function toView(row: WishlistItemRow): WishlistItemView | null {
  // Skip rows whose product was soft-deleted after the wishlist was saved.
  if (!row.product || row.product.deletedAt) return null;
  const p = row.product;
  const variants = p.variants;
  const def = variants.find((v) => v.isDefault) ?? variants[0];
  const price = def?.prices[0];
  const inStock = variants.some((v) =>
    v.inventory.some((i) => i.onHand - i.reserved > 0),
  );
  return {
    id: row.id,
    productId: p.id,
    productSlug: p.slug,
    productName: p.name,
    brandName: p.brand?.name ?? null,
    primaryImageUrl: p.media[0]?.url ?? null,
    priceMinor: price?.amountMinor ?? 0n,
    compareAtMinor: price?.compareAtAmountMinor ?? null,
    currency: price?.currency ?? "INR",
    inStock,
    addedAt: row.createdAt,
  };
}

export async function listWishlist(customerId: string): Promise<WishlistItemView[]> {
  const rows = await prisma.wishlistItem.findMany({
    where: { customerId, product: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    include: wishlistInclude,
  });
  return rows
    .map(toView)
    .filter((x): x is WishlistItemView => x != null);
}

export async function listWishlistProductIds(customerId: string): Promise<string[]> {
  const rows = await prisma.wishlistItem.findMany({
    where: { customerId },
    select: { productId: true },
  });
  return rows.map((r) => r.productId);
}

export async function isInWishlist(
  customerId: string,
  productId: string,
): Promise<boolean> {
  const row = await prisma.wishlistItem.findUnique({
    where: { customerId_productId: { customerId, productId } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function addToWishlist(
  customerId: string,
  productId: string,
): Promise<void> {
  // Idempotent: ignore the unique-violation if already there.
  await prisma.wishlistItem.upsert({
    where: { customerId_productId: { customerId, productId } },
    update: {},
    create: { customerId, productId },
  });
}

export async function removeFromWishlist(
  customerId: string,
  productId: string,
): Promise<void> {
  await prisma.wishlistItem.deleteMany({
    where: { customerId, productId },
  });
}
