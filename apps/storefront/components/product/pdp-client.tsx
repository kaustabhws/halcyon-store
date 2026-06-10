"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BRAND } from "@ecom/shared/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { cn } from "@/lib/cn";
import { formatPrice, discountPercent } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import type { ProductDetailView } from "@/lib/db";

type Variant = ProductDetailView["variants"][number];
type Media = ProductDetailView["media"][number];

type AttrGroup = {
  code: string;
  label: string;
  values: Array<{ value: string; valueLabel: string; swatchHex: string | null }>;
};

function buildAttrGroups(variants: Variant[]): AttrGroup[] {
  const groups = new Map<string, AttrGroup>();
  for (const v of variants) {
    for (const a of v.attributes) {
      let g = groups.get(a.code);
      if (!g) {
        g = { code: a.code, label: a.label, values: [] };
        groups.set(a.code, g);
      }
      if (!g.values.find((x) => x.value === a.value)) {
        g.values.push({
          value: a.value,
          valueLabel: a.valueLabel,
          swatchHex: a.swatchHex,
        });
      }
    }
  }
  return [...groups.values()];
}

function findVariant(variants: Variant[], selection: Record<string, string>): Variant | undefined {
  return variants.find((v) =>
    Object.entries(selection).every(([code, val]) =>
      v.attributes.some((a) => a.code === code && a.value === val),
    ),
  );
}

/**
 * A value for an attribute is "selectable" if at least one variant carries
 * that value. We deliberately do NOT require the value to be compatible with
 * the rest of the current selection — clicking it snaps the other attributes
 * to a matching variant (see pickBestVariant). This avoids the classic
 * sparse-matrix dead-end where you can't switch color because the current
 * size/fit combo doesn't exist for the other color.
 *
 * Out-of-stock values are still shown but visually de-emphasized: a value is
 * "in stock" only if some variant with it has availability.
 */
function valueExists(variants: Variant[], code: string, value: string): boolean {
  return variants.some((v) =>
    v.attributes.some((a) => a.code === code && a.value === value),
  );
}

function valueInStock(variants: Variant[], code: string, value: string): boolean {
  return variants.some(
    (v) =>
      v.available > 0 &&
      v.attributes.some((a) => a.code === code && a.value === value),
  );
}

/**
 * Given the current selection and a newly-clicked (code,value), pick the
 * variant that best matches: it must contain the clicked value, and among
 * those we prefer the one that overlaps most with the rest of the current
 * selection, preferring in-stock variants on ties. Returns the full
 * attribute selection for that variant.
 */
function pickBestVariant(
  variants: Variant[],
  selection: Record<string, string>,
  code: string,
  value: string,
): Record<string, string> {
  const candidates = variants.filter((v) =>
    v.attributes.some((a) => a.code === code && a.value === value),
  );
  if (candidates.length === 0) return { ...selection, [code]: value };

  let best = candidates[0]!;
  let bestScore = -1;
  for (const v of candidates) {
    let overlap = 0;
    for (const [c, val] of Object.entries(selection)) {
      if (c === code) continue;
      if (v.attributes.some((a) => a.code === c && a.value === val)) overlap += 1;
    }
    // In-stock variants win ties so clicking lands on something buyable.
    const score = overlap * 2 + (v.available > 0 ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }

  const next: Record<string, string> = {};
  for (const a of best.attributes) next[a.code] = a.value;
  return next;
}

/**
 * Filters the gallery for the active variant when the product opted into
 * per-attribute images. Strategy:
 *  - find the customer's selected value for the product's image attribute
 *    (e.g. Color = "black")
 *  - show images tagged to that value, with any shared (untagged) images
 *    appended as fallback
 *  - if nothing is tagged for the value, show the full gallery
 *
 * The shared images always appear last so the value-specific shot is the
 * hero.
 */
function pickGalleryImages(
  product: ProductDetailView,
  selection: Record<string, string>,
): Media[] {
  const code = product.imageAttributeCode;
  if (!product.useVariantImages || !code) return product.media;
  const selectedValue = selection[code];
  if (!selectedValue) return product.media;
  const tagged = product.media.filter((m) => m.attributeValue === selectedValue);
  const shared = product.media.filter((m) => m.attributeValue === null);
  return tagged.length > 0 ? [...tagged, ...shared] : product.media;
}

export function PdpClient({
  product,
  wishlist,
}: {
  product: ProductDetailView;
  wishlist: { isAuthed: boolean; inWishlist: boolean };
}) {
  const groups = React.useMemo(() => buildAttrGroups(product.variants), [product.variants]);

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

        {groups.map((g) => (
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
  const safe = images.length > 0 ? images : [{ url: "", altText: product.name, isPrimary: true, attributeValue: null }];
  const main = safe[active] ?? safe[0]!;

  return (
    <div className="space-y-3">
      <div className="relative aspect-4/5 overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900">
        {main.url ? (
          <Image
            src={main.url}
            alt={main.altText ?? product.name}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>
      {safe.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {safe.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl bg-zinc-100 transition-all dark:bg-zinc-900",
                i === active ? "ring-2 ring-foreground" : "opacity-70 hover:opacity-100",
              )}
            >
              {m.url ? (
                <Image src={m.url} alt={m.altText ?? ""} fill sizes="20vw" className="object-cover" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
