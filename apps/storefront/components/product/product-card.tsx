import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { QuickViewButton } from "@/components/product/quick-view";
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

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-muted transition-shadow hover:shadow-lg",
        className,
      )}
    >
      <div className="relative aspect-4/5 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        <Link href={`/product/${product.slug}`} aria-label={product.name} className="absolute inset-0">
          {product.primaryImageUrl ? (
            <Image
              src={product.primaryImageUrl}
              alt={product.primaryImageAlt ?? product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </Link>

        {off ? (
          <Badge
            variant="accent"
            className="pointer-events-none absolute left-4 top-4 z-10 text-[10px] tracking-widest"
          >
            {off}% OFF
          </Badge>
        ) : null}
        {!product.inStock ? (
          <Badge
            variant="outline"
            className="pointer-events-none absolute right-4 top-4 z-10 bg-background/80"
          >
            Sold out
          </Badge>
        ) : null}

        {/* Quick view, centered over the image. Outside the <Link> so clicking
            it opens the modal instead of navigating to the PDP. */}
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/15 group-hover:opacity-100 focus-within:opacity-100">
          <div className="pointer-events-auto">
            <QuickViewButton product={product} />
          </div>
        </div>
      </div>

      <Link href={`/product/${product.slug}`} className="flex flex-col gap-1 p-4">
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
      </Link>
    </div>
  );
}
