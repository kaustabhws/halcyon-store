"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Eye, Plus, Minus, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatPrice, discountPercent } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { getQuickViewAction } from "@/lib/quick-view-actions";
import type { ProductCardView, ProductDetailView } from "@/lib/db";
import {
  buildAttrGroups,
  findVariant,
  valueExists,
  valueInStock,
  pickBestVariant,
  pickGalleryImages,
  initialSelection,
} from "@/lib/variant-selection";

/** Hover-revealed "Quick view" button + the modal it opens. Detail data is
 *  fetched lazily the first time the modal is opened. */
export function QuickViewButton({ product }: { product: ProductCardView }) {
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<ProductDetailView | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !detail && !loading) {
      setLoading(true);
      try {
        const d = await getQuickViewAction(product.slug);
        setDetail(d);
      } catch {
        toast.error("Couldn't load product");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-background/95 px-4 py-2 text-xs font-medium shadow-lg ring-1 ring-border backdrop-blur transition-colors hover:bg-background"
      >
        <Eye className="h-3.5 w-3.5" /> Quick view
      </button>

      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Quick view — choose options and add to bag.
        </DialogDescription>
        {loading || !detail ? (
          loading ? (
            <QuickViewSkeleton product={product} />
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              This product is no longer available.
            </div>
          )
        ) : (
          <QuickViewPanel product={detail} onClose={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuickViewPanel({
  product,
  onClose,
}: {
  product: ProductDetailView;
  onClose: () => void;
}) {
  const groups = React.useMemo(() => buildAttrGroups(product.variants), [product.variants]);
  const choiceGroups = React.useMemo(() => groups.filter((g) => g.values.length > 1), [groups]);
  const fixedGroups = React.useMemo(() => groups.filter((g) => g.values.length === 1), [groups]);

  const [selection, setSelection] = React.useState<Record<string, string>>(() =>
    initialSelection(product.variants),
  );
  const [qty, setQty] = React.useState(1);

  const current = React.useMemo(
    () => findVariant(product.variants, selection) ?? product.variants[0],
    [product.variants, selection],
  );
  const image = React.useMemo(() => {
    const g = pickGalleryImages(product, selection);
    return g[0] ?? product.media[0] ?? null;
  }, [product, selection]);

  const available = current?.available ?? 0;
  const off = current ? discountPercent(current.priceMinor, current.compareAtMinor) : null;

  React.useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), Math.max(1, available)));
  }, [available]);

  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = React.useState(false);
  const [added, setAdded] = React.useState(false);

  async function addToCart() {
    if (!current || available <= 0) return;
    setAdding(true);
    try {
      const res = await addItem(current.id, qty);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAdded(true);
      toast.success(`${product.name} added to bag`);
      setTimeout(() => setAdded(false), 1500);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="grid max-h-[85vh] grid-cols-1 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="relative aspect-4/5 w-full bg-zinc-100 dark:bg-zinc-900 sm:aspect-auto">
        {image?.url ? (
          <Image
            src={image.url}
            alt={image.altText ?? product.name}
            fill
            sizes="(min-width: 640px) 45vw, 100vw"
            className="object-cover"
          />
        ) : null}
        {off ? (
          <Badge variant="accent" className="absolute left-4 top-4 text-[10px] tracking-widest">
            {off}% OFF
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto p-6">
        <div>
          {product.brandName ? (
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {product.brandName}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{product.name}</h2>
          {product.reviewCount > 0 && product.averageRating != null ? (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <StarRating value={product.averageRating} size="xs" />
              <span className="tabular-nums">
                {product.averageRating.toFixed(1)} ({product.reviewCount})
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold">
            {current ? formatPrice(current.priceMinor, product.currency) : "—"}
          </span>
          {current?.compareAtMinor ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(current.compareAtMinor, product.currency)}
            </span>
          ) : null}
        </div>

        {product.shortDescription ? (
          <p className="text-sm text-muted-foreground">{product.shortDescription}</p>
        ) : null}

        {fixedGroups.length > 0 ? (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {fixedGroups.map((g) => {
              const v = g.values[0]!;
              return (
                <span key={g.code} className="inline-flex items-center gap-1.5 text-muted-foreground">
                  {g.label}:
                  {v.swatchHex ? (
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border"
                      style={{ background: v.swatchHex }}
                    />
                  ) : null}
                  <span className="text-foreground">{v.valueLabel}</span>
                </span>
              );
            })}
          </div>
        ) : null}

        {choiceGroups.map((g) => (
          <div key={g.code} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{g.label}</span>
              <span className="text-muted-foreground">
                {g.values.find((v) => v.value === selection[g.code])?.valueLabel ?? ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.values.map((v) => {
                const active = selection[g.code] === v.value;
                const exists = valueExists(product.variants, g.code, v.value);
                const inStock = valueInStock(product.variants, g.code, v.value);
                const selectable = inStock || active;
                if (!exists) return null;
                return (
                  <button
                    key={v.value}
                    type="button"
                    disabled={!selectable}
                    onClick={() =>
                      setSelection(pickBestVariant(product.variants, selection, g.code, v.value))
                    }
                    className={cn(
                      "min-w-11 rounded-full border px-3.5 py-1.5 text-sm transition-all",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground",
                      !selectable && "cursor-not-allowed text-muted-foreground line-through opacity-60",
                    )}
                  >
                    {v.swatchHex ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-3 w-3 rounded-full border"
                          style={{ background: v.swatchHex }}
                        />
                        {v.valueLabel}
                      </span>
                    ) : (
                      v.valueLabel
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-auto space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(available, q + 1))}
                disabled={qty >= available}
                className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              type="button"
              size="lg"
              className="flex-1 rounded-full"
              disabled={adding || available <= 0}
              onClick={addToCart}
            >
              {available <= 0 ? (
                "Sold out"
              ) : added ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : adding ? (
                "Adding…"
              ) : (
                "Add to bag"
              )}
            </Button>
          </div>

          <Button asChild variant="ghost" className="w-full" onClick={onClose}>
            <Link href={`/product/${product.slug}`}>
              View full details <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuickViewSkeleton({ product }: { product: ProductCardView }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="relative aspect-4/5 w-full bg-zinc-100 dark:bg-zinc-900">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.primaryImageAlt ?? product.name}
            fill
            sizes="(min-width: 640px) 45vw, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="space-y-4 p-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
