"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Autoplay from "embla-carousel-autoplay";
import { BRAND } from "@ecom/shared/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { cn } from "@/lib/cn";
import { formatPrice, discountPercent } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import type { ProductDetailView } from "@/lib/db";
import {
  type Variant,
  type Media,
  buildAttrGroups,
  findVariant,
  valueExists,
  valueInStock,
  pickBestVariant,
  pickGalleryImages,
} from "@/lib/variant-selection";

export function PdpClient({
  product,
  wishlist,
}: {
  product: ProductDetailView;
  wishlist: { isAuthed: boolean; inWishlist: boolean };
}) {
  const groups = React.useMemo(() => buildAttrGroups(product.variants), [product.variants]);
  // Only attributes that actually vary become pickers; single-value ones
  // (e.g. a jean that comes in one color) show as static metadata instead of
  // a pointless 1-option control — while still feeding facets + filtering.
  const choiceGroups = React.useMemo(() => groups.filter((g) => g.values.length > 1), [groups]);
  const fixedGroups = React.useMemo(() => groups.filter((g) => g.values.length === 1), [groups]);

  const initial = React.useMemo(() => {
    const def = product.variants.find((v) => v.isDefault) ?? product.variants[0];
    const out: Record<string, string> = {};
    if (def) for (const a of def.attributes) out[a.code] = a.value;
    return out;
  }, [product.variants]);

  const [selection, setSelection] = React.useState<Record<string, string>>(initial);
  const [activeImage, setActiveImage] = React.useState(0);

  const current: Variant | undefined = React.useMemo(
    () => findVariant(product.variants, selection) ?? product.variants[0],
    [product.variants, selection],
  );

  const gallery = React.useMemo(
    () => pickGalleryImages(product, selection),
    [product, selection],
  );

  // Reset to first image whenever the visible gallery changes (variant swap).
  const galleryKey = gallery.map((m) => m.url).join("|");
  React.useEffect(() => {
    setActiveImage(0);
  }, [galleryKey]);

  const off = current ? discountPercent(current.priceMinor, current.compareAtMinor) : null;
  const available = current?.available ?? 0;

  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = React.useState(false);

  async function addToCart() {
    if (!current) return;
    setAdding(true);
    try {
      const res = await addItem(current.id, 1);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Added to bag", {
        action: { label: "View bag", onClick: () => router.push("/cart") },
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="grid gap-12 md:grid-cols-2">
      <PdpGallery
        product={product}
        images={gallery}
        active={activeImage}
        onChange={setActiveImage}
      />

      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-zinc-500">
            {product.brandName ?? BRAND.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {product.name}
          </h1>
          {product.shortDescription ? (
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              {product.shortDescription}
            </p>
          ) : null}
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold">
            {current ? formatPrice(current.priceMinor, product.currency) : "—"}
          </span>
          {current?.compareAtMinor ? (
            <span className="text-base text-zinc-500 line-through">
              {formatPrice(current.compareAtMinor, product.currency)}
            </span>
          ) : null}
          {off ? <Badge variant="accent">{off}% OFF</Badge> : null}
        </div>

        {fixedGroups.length > 0 ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {fixedGroups.map((g) => {
              const v = g.values[0]!;
              return (
                <div key={g.code} className="flex items-center gap-2">
                  <span className="text-zinc-500">{g.label}:</span>
                  {v.swatchHex ? (
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border align-middle"
                      style={{ background: v.swatchHex }}
                    />
                  ) : null}
                  <span className="font-medium">{v.valueLabel}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {choiceGroups.map((g) => (
          <div key={g.code} className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{g.label}</span>
              <span className="text-zinc-500">
                {g.values.find((v) => v.value === selection[g.code])?.valueLabel ?? ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.values.map((v) => {
                const active = selection[g.code] === v.value;
                const exists = valueExists(product.variants, g.code, v.value);
                const inStock = valueInStock(product.variants, g.code, v.value);
                // Selectable only when the value can actually be bought
                // (in stock on some variant). Out-of-stock-everywhere values
                // get a strikethrough AND are disabled so the two signals
                // agree — no "marked unavailable but still clickable".
                const selectable = inStock || active;
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() =>
                      setSelection(
                        pickBestVariant(product.variants, selection, g.code, v.value),
                      )
                    }
                    disabled={!selectable}
                    className={cn(
                      "min-w-12 rounded-full border px-4 py-2 text-sm transition-all",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-zinc-300 hover:border-foreground dark:border-zinc-700",
                      !selectable && "cursor-not-allowed opacity-40",
                      exists && !inStock && !active && "line-through",
                    )}
                    title={exists && !inStock ? "Out of stock" : undefined}
                  >
                    {v.swatchHex ? (
                      <span
                        className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                        style={{ background: v.swatchHex }}
                      />
                    ) : null}
                    {v.valueLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2">
          <div className="flex items-stretch gap-2">
            <Button
              size="lg"
              className="flex-1"
              onClick={addToCart}
              disabled={!current || available <= 0 || adding}
            >
              {!current
                ? "Pick a variant"
                : available <= 0
                  ? "Sold out"
                  : adding
                    ? "Adding…"
                    : "Add to bag"}
            </Button>
            <WishlistButton
              productId={product.id}
              isAuthed={wishlist.isAuthed}
              initialInWishlist={wishlist.inWishlist}
              variant="outline"
              className="h-10 w-10"
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {available > 0 && available <= 5 ? `Only ${available} left in stock` : null}
          </p>
        </div>
      </div>

      <StickyMobileCta
        productName={product.name}
        variantName={current?.name ?? null}
        priceMinor={current?.priceMinor ?? null}
        currency={product.currency}
        available={available}
        adding={adding}
        onAdd={addToCart}
      />
    </div>
  );
}

function StickyMobileCta({
  productName,
  variantName,
  priceMinor,
  currency,
  available,
  adding,
  onAdd,
}: {
  productName: string;
  variantName: string | null;
  priceMinor: bigint | null;
  currency: string;
  available: number;
  adding: boolean;
  onAdd: () => void;
}) {
  // Watch the inline CTA: when it scrolls out of view, show the sticky bar.
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-xl transition-transform duration-300 md:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
      // Respect iOS home indicator
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{productName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {variantName ?? "Pick a variant"}
            {priceMinor != null
              ? ` · ${formatPrice(priceMinor, currency)}`
              : ""}
          </p>
        </div>
        <Button
          size="lg"
          onClick={onAdd}
          disabled={priceMinor == null || available <= 0 || adding}
        >
          {available <= 0 ? "Sold out" : adding ? "Adding…" : "Add"}
        </Button>
      </div>
    </div>
  );
}

function PdpGallery({
  product,
  images,
  active,
  onChange,
}: {
  product: ProductDetailView;
  images: Media[];
  active: number;
  onChange: (i: number) => void;
}) {
  const safe =
    images.length > 0
      ? images
      : [{ url: "", altText: product.name, isPrimary: true, attributeValue: null }];
  const multiple = safe.length > 1;

  const autoplay = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const [selected, setSelected] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  // Keep the parent (and thumbnails) in sync with whichever slide is showing.
  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const i = api.selectedScrollSnap();
      setSelected(i);
      onChange(i);
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onChange]);

  // External index changes (e.g. a variant swap resets to image 0) drive the
  // carousel. Guarded so it never fights the user-driven `select` above.
  React.useEffect(() => {
    if (!api) return;
    if (api.selectedScrollSnap() !== active) api.scrollTo(active);
  }, [api, active]);

  return (
    <div className="space-y-3">
      <Carousel
        setApi={setApi}
        opts={{ loop: multiple }}
        plugins={multiple ? [autoplay.current] : []}
        className="overflow-hidden rounded-3xl"
      >
        <CarouselContent className="ml-0">
          {safe.map((m, i) => (
            <CarouselItem key={i} className="pl-0">
              <button
                type="button"
                onClick={() => m.url && setLightboxOpen(true)}
                className={cn(
                  "group relative block aspect-4/5 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900",
                  m.url ? "cursor-zoom-in" : "cursor-default",
                )}
                aria-label="Open image in full screen"
              >
                {m.url ? (
                  <Image
                    src={m.url}
                    alt={m.altText ?? product.name}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : null}
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        {multiple ? (
          <>
            <CarouselPrevious className="left-3 bg-background/80 backdrop-blur" />
            <CarouselNext className="right-3 bg-background/80 backdrop-blur" />
          </>
        ) : null}
      </Carousel>

      {multiple ? (
        <div className="grid grid-cols-5 gap-2">
          {safe.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl bg-zinc-100 transition-all dark:bg-zinc-900",
                i === selected ? "ring-2 ring-foreground" : "opacity-70 hover:opacity-100",
              )}
            >
              {m.url ? (
                <Image src={m.url} alt={m.altText ?? ""} fill sizes="20vw" className="object-cover" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <PdpLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={safe}
        startIndex={selected}
        productName={product.name}
      />
    </div>
  );
}

function PdpLightbox({
  open,
  onOpenChange,
  images,
  startIndex,
  productName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: Media[];
  startIndex: number;
  productName: string;
}) {
  const multiple = images.length > 1;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-0 bg-transparent p-0 shadow-none sm:max-w-5xl">
        <DialogTitle className="sr-only">{productName} — image viewer</DialogTitle>
        <Carousel
          opts={{ startIndex, loop: multiple }}
          className="w-full px-6"
        >
          <CarouselContent className="ml-0">
            {images.map((m, i) => (
              <CarouselItem key={i} className="pl-0">
                <div className="relative flex aspect-square w-full items-center justify-center md:aspect-video">
                  {m.url ? (
                    <Image
                      src={m.url}
                      alt={m.altText ?? productName}
                      fill
                      sizes="90vw"
                      className="object-contain"
                    />
                  ) : null}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {multiple ? (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          ) : null}
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
