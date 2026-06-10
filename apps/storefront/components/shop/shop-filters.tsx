"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import type { FacetView } from "@/lib/db";

const COMMON_KEYS = [
  "q",
  "category",
  "brand",
  "attr",
  "minPrice",
  "maxPrice",
  "inStock",
  "sort",
];

function buildHref(
  pathname: string,
  current: URLSearchParams,
  patch: Record<string, string | string[] | null>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(patch)) {
    next.delete(k);
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) next.append(k, item);
    } else if (v !== "") {
      next.set(k, v);
    }
  }
  // Reset to page 1 whenever a filter changes — otherwise narrowing the
  // results can land the user on a now-empty page.
  next.delete("page");
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function ShopFilters({
  facets,
  fixedCategorySlug,
}: {
  facets: FacetView;
  /**
   * When set, the category filter UI is hidden — the page is already
   * scoped to a single category (e.g. /shop/sneakers).
   */
  fixedCategorySlug?: string;
}) {
  // Desktop sidebar: rendered hidden below `lg`. The mobile drawer trigger
  // (ShopFiltersDrawer) replaces it on small screens.
  return (
    <aside className="hidden space-y-6 lg:block">
      <ShopFiltersBody facets={facets} fixedCategorySlug={fixedCategorySlug} />
    </aside>
  );
}

/**
 * Mobile-only filter trigger + drawer. The trigger sits next to the sort
 * bar on small screens; tapping it opens a bottom sheet that hosts the
 * exact same filter UI as the desktop sidebar. URL is the source of truth,
 * so closing the drawer doesn't lose state.
 */
export function ShopFiltersDrawer({
  facets,
  fixedCategorySlug,
}: {
  facets: FacetView;
  fixedCategorySlug?: string;
}) {
  const searchParams = useSearchParams();
  const activeCount = countActiveFilters(searchParams, fixedCategorySlug);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 ? (
            <Badge
              variant="default"
              className="ml-1 h-5 min-w-5 justify-center px-1 text-[10px]"
            >
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription className="sr-only">
            Refine the product list.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <ShopFiltersBody
            facets={facets}
            fixedCategorySlug={fixedCategorySlug}
          />
        </div>
        <DrawerFooter className="border-t pt-3">
          <DrawerClose asChild>
            <Button>View results</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function countActiveFilters(
  searchParams: ReadonlyURLSearchParams,
  fixedCategorySlug: string | undefined,
): number {
  const brands = searchParams.getAll("brand").length;
  const attrs = searchParams.getAll("attr").length;
  const inStock = searchParams.get("inStock") === "true" ? 1 : 0;
  const minP = searchParams.get("minPrice") ? 1 : 0;
  const maxP = searchParams.get("maxPrice") ? 1 : 0;
  const cat = !fixedCategorySlug && searchParams.get("category") ? 1 : 0;
  return brands + attrs + inStock + minP + maxP + cat;
}

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

/**
 * The actual filter controls. Extracted so both the desktop sidebar and
 * the mobile drawer can reuse them — same state model, same URL writes.
 */
function ShopFiltersBody({
  facets,
  fixedCategorySlug,
}: {
  facets: FacetView;
  fixedCategorySlug?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedBrands = React.useMemo(
    () => searchParams.getAll("brand"),
    [searchParams],
  );
  const selectedAttrs = React.useMemo(
    () => searchParams.getAll("attr"),
    [searchParams],
  );
  const inStockOnly = searchParams.get("inStock") === "true";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  function toggleArrayParam(key: string, value: string) {
    const current = searchParams.getAll(key);
    const isOn = current.includes(value);
    const next = isOn
      ? current.filter((v) => v !== value)
      : [...current, value];
    router.push(buildHref(pathname, searchParams, { [key]: next }));
  }

  function setSingleParam(key: string, value: string | null) {
    router.push(buildHref(pathname, searchParams, { [key]: value }));
  }

  function clearAll() {
    const keep = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) keep.set("q", q);
    const sort = searchParams.get("sort");
    if (sort) keep.set("sort", sort);
    const category = searchParams.get("category");
    if (category && fixedCategorySlug == null) keep.set("category", category);
    router.push(`${pathname}${keep.toString() ? `?${keep.toString()}` : ""}`);
  }

  const activeFilterCount =
    selectedBrands.length +
    selectedAttrs.length +
    (inStockOnly ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Filters</h2>
        {activeFilterCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 px-2 text-xs"
          >
            Clear all
          </Button>
        ) : null}
      </div>

      {facets.categories.length > 0 && !fixedCategorySlug ? (
        <FilterSection title="Category">
          <ul className="space-y-1">
            {facets.categories.map((c) => {
              const checked = searchParams.get("category") === c.slug;
              return (
                <li key={c.slug}>
                  <CheckboxRow
                    label={c.name}
                    count={c.count}
                    checked={checked}
                    onChange={() =>
                      setSingleParam("category", checked ? null : c.slug)
                    }
                  />
                </li>
              );
            })}
          </ul>
        </FilterSection>
      ) : null}

      {facets.brands.length > 0 ? (
        <FilterSection title="Brand">
          <ul className="space-y-1">
            {facets.brands.map((b) => (
              <li key={b.slug}>
                <CheckboxRow
                  label={b.name}
                  count={b.count}
                  checked={selectedBrands.includes(b.slug)}
                  onChange={() => toggleArrayParam("brand", b.slug)}
                />
              </li>
            ))}
          </ul>
        </FilterSection>
      ) : null}

      {facets.attributes.map((group) => (
        <FilterSection key={group.code} title={group.label}>
          {group.code === "color" ? (
            <SwatchGroup
              values={group.values}
              selected={selectedAttrs}
              onToggle={(facet) => toggleArrayParam("attr", facet)}
              groupCode={group.code}
            />
          ) : (
            <ul className="space-y-1">
              {group.values.map((v) => {
                const facet = `${group.code}:${v.value}`;
                return (
                  <li key={facet}>
                    <CheckboxRow
                      label={v.label}
                      count={v.count}
                      checked={selectedAttrs.includes(facet)}
                      onChange={() => toggleArrayParam("attr", facet)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </FilterSection>
      ))}

      {facets.priceRange.minMinor !== facets.priceRange.maxMinor ? (
        <FilterSection title="Price (INR)">
          <PriceRangeForm
            currentMin={minPrice}
            currentMax={maxPrice}
            absoluteMin={facets.priceRange.minMinor}
            absoluteMax={facets.priceRange.maxMinor}
          />
        </FilterSection>
      ) : null}

      <FilterSection title="Availability">
        <CheckboxRow
          label="In stock only"
          checked={inStockOnly}
          onChange={() => setSingleParam("inStock", inStockOnly ? null : "true")}
        />
      </FilterSection>
    </div>
  );
}

export function ShopSortBar({
  totalCount,
  processingTimeMs,
}: {
  totalCount: number;
  processingTimeMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = (searchParams.get("sort") ?? "relevance") as
    | "relevance"
    | "newest"
    | "price-asc"
    | "price-desc";

  const SORTS = [
    { value: "relevance", label: "Relevance" },
    { value: "newest", label: "Newest" },
    { value: "price-asc", label: "Price · Low" },
    { value: "price-desc", label: "Price · High" },
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {totalCount} {totalCount === 1 ? "result" : "results"}
        {processingTimeMs != null ? ` · ${processingTimeMs}ms` : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => {
          const active = sort === s.value;
          const href = buildHref(pathname, searchParams, {
            sort: s.value === "relevance" ? null : s.value,
          });
          return (
            <Button
              key={s.value}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => router.push(href)}
              className="h-8 text-xs"
            >
              {s.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function ActiveFilterChips({ facets }: { facets: FacetView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chips: Array<{ label: string; href: string }> = [];

  const selectedBrands = searchParams.getAll("brand");
  for (const slug of selectedBrands) {
    const brand = facets.brands.find((b) => b.slug === slug);
    const label = brand?.name ?? slug;
    chips.push({
      label: `Brand: ${label}`,
      href: buildHref(pathname, searchParams, {
        brand: selectedBrands.filter((s) => s !== slug),
      }),
    });
  }

  const selectedAttrs = searchParams.getAll("attr");
  for (const facet of selectedAttrs) {
    const [code, value] = facet.split(":");
    if (!code || !value) continue;
    const group = facets.attributes.find((a) => a.code === code);
    const label =
      group?.values.find((v) => v.value === value)?.label ?? value;
    chips.push({
      label: `${group?.label ?? code}: ${label}`,
      href: buildHref(pathname, searchParams, {
        attr: selectedAttrs.filter((f) => f !== facet),
      }),
    });
  }

  const inStock = searchParams.get("inStock") === "true";
  if (inStock) {
    chips.push({
      label: "In stock only",
      href: buildHref(pathname, searchParams, { inStock: null }),
    });
  }

  const minP = searchParams.get("minPrice");
  if (minP) {
    chips.push({
      label: `Min ${formatPrice(BigInt(Number(minP) * 100), "INR")}`,
      href: buildHref(pathname, searchParams, { minPrice: null }),
    });
  }
  const maxP = searchParams.get("maxPrice");
  if (maxP) {
    chips.push({
      label: `Max ${formatPrice(BigInt(Number(maxP) * 100), "INR")}`,
      href: buildHref(pathname, searchParams, { maxPrice: null }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <Badge
          key={`${chip.label}-${i}`}
          variant="outline"
          asChild
          className="cursor-pointer pl-2 pr-1 py-0.5 hover:bg-muted"
        >
          <button type="button" onClick={() => router.push(chip.href)}>
            <span>{chip.label}</span>
            <span className="ml-1 text-muted-foreground">×</span>
          </button>
        </Badge>
      ))}
    </div>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
      <Separator />
    </div>
  );
}

function CheckboxRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        checked ? "bg-foreground text-background" : "hover:bg-muted",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "grid h-4 w-4 place-items-center rounded-sm border",
            checked
              ? "border-background bg-background text-foreground"
              : "border-muted-foreground/40",
          )}
        >
          {checked ? <Check className="h-3 w-3" /> : null}
        </span>
        <span>{label}</span>
      </span>
      {count != null ? (
        <span
          className={cn(
            "text-xs tabular-nums",
            checked ? "text-background/70" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function SwatchGroup({
  values,
  selected,
  onToggle,
  groupCode,
}: {
  values: FacetView["attributes"][number]["values"];
  selected: string[];
  onToggle: (facet: string) => void;
  groupCode: string;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {values.map((v) => {
        const facet = `${groupCode}:${v.value}`;
        const checked = selected.includes(facet);
        const swatch = v.swatchHex ?? "#e5e5e5";
        return (
          <button
            key={facet}
            type="button"
            onClick={() => onToggle(facet)}
            aria-pressed={checked}
            title={`${v.label} (${v.count})`}
            className={cn(
              "relative grid h-9 w-9 place-items-center rounded-full border-2 transition-all",
              checked
                ? "border-foreground"
                : "border-transparent hover:border-muted-foreground/30",
            )}
          >
            <span
              className="block h-7 w-7 rounded-full border border-zinc-300/40 dark:border-zinc-700/40"
              style={{ background: swatch }}
            />
            {checked ? (
              <Check className="absolute h-4 w-4 text-foreground mix-blend-difference" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PriceRangeForm({
  currentMin,
  currentMax,
  absoluteMin,
  absoluteMax,
}: {
  currentMin: string;
  currentMax: string;
  absoluteMin: bigint;
  absoluteMax: bigint;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [minInput, setMinInput] = React.useState(currentMin);
  const [maxInput, setMaxInput] = React.useState(currentMax);

  React.useEffect(() => setMinInput(currentMin), [currentMin]);
  React.useEffect(() => setMaxInput(currentMax), [currentMax]);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      buildHref(pathname, searchParams, {
        minPrice: minInput || null,
        maxPrice: maxInput || null,
      }),
    );
  }

  const absMinRupee = Number(absoluteMin) / 100;
  const absMaxRupee = Number(absoluteMax) / 100;

  return (
    <form onSubmit={apply} className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Range: ₹{absMinRupee.toLocaleString("en-IN")} – ₹
        {absMaxRupee.toLocaleString("en-IN")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="minPrice" className="text-xs">
            Min
          </Label>
          <Input
            id="minPrice"
            type="number"
            inputMode="numeric"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            placeholder={String(Math.floor(absMinRupee))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maxPrice" className="text-xs">
            Max
          </Label>
          <Input
            id="maxPrice"
            type="number"
            inputMode="numeric"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            placeholder={String(Math.ceil(absMaxRupee))}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button type="submit" size="sm" variant="outline" className="w-full">
        Apply
      </Button>
    </form>
  );
}

export function ShopPager({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const prevHref =
    page > 1
      ? buildHref(pathname, searchParams, { page: String(page - 1) })
      : null;
  const nextHref =
    page < totalPages
      ? buildHref(pathname, searchParams, { page: String(page + 1) })
      : null;

  return (
    <div className="mt-12 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!prevHref}
          onClick={() => prevHref && router.push(prevHref)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!nextHref}
          onClick={() => nextHref && router.push(nextHref)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// `COMMON_KEYS` exported only to silence "unused" — used by callers if they
// need to preserve filters across navigation in the future.
export const FILTER_KEYS = COMMON_KEYS;
