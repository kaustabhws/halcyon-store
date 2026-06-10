import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { QuickAddButton } from "@/components/product/quick-add-button";
import { formatPrice, discountPercent } from "@/lib/format";
import type { ProductCardView } from "@/lib/db";
import { cn } from "@/lib/cn";

export function ProductCard({
  product,
  className,
}: {
  product: ProductCardView;
  className?: string;
}) {
  const off = discountPercent(product.priceMinor, product.compareAtMinor);
  // Only show the quick-add button when there's a single resolvable
  // default-variant target. Multi-variant products need the customer to
  // pick a size/color, so the card link still falls through to the PDP.
  const canQuickAdd =
    product.inStock && product.defaultVariantId != null && product.variantCount <= 1;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-muted transition-shadow hover:shadow-lg",
        className,
      )}
    >
      <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-4/5 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          {product.primaryImageUrl ? (
            <Image
              src={product.primaryImageUrl}
              alt={product.primaryImageAlt ?? product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          {off ? (
            <Badge
              variant="accent"
              className="absolute left-4 top-4 text-[10px] tracking-widest"
            >
              {off}% OFF
            </Badge>
          ) : null}
          {!product.inStock ? (
            <Badge
              variant="outline"
              className="absolute right-4 top-4 bg-background/80"
            >
              Sold out
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 p-4">
          {product.brandName ? (
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {product.brandName}
            </p>
          ) : null}
          <h3 className="text-sm font-medium leading-snug">{product.name}</h3>
          {product.reviewCount > 0 && product.averageRating != null ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <StarRating value={product.averageRating} size="xs" />
              <span className="tabular-nums">
                {product.averageRating.toFixed(1)} ({product.reviewCount})
              </span>
            </div>
          ) : null}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold">
              {product.maxPriceMinor > product.priceMinor ? "From " : ""}
              {formatPrice(product.priceMinor, product.currency)}
            </span>
            {product.compareAtMinor &&
            product.maxPriceMinor === product.priceMinor ? (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtMinor, product.currency)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Quick-add appears on hover (md+) or always visible on touch. Sits
          inside the card but outside the <Link> so clicking it doesn't
          navigate. */}
      {canQuickAdd && product.defaultVariantId ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:focus-within:opacity-100">
          <div className="pointer-events-auto">
            <QuickAddButton
              variantId={product.defaultVariantId}
              productName={product.name}
            />
          </div>
        </div>
      ) : null}

      {/* Multi-variant: nudge user to PDP via "Choose options" */}
      {product.inStock && product.variantCount > 1 ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:focus-within:opacity-100">
          <Link
            href={`/product/${product.slug}`}
            className="pointer-events-auto flex w-full items-center justify-center rounded-full bg-foreground px-3 py-2 text-xs font-medium text-background shadow-md hover:opacity-90"
          >
            Choose options
          </Link>
        </div>
      ) : null}
    </div>
  );
}
