import type { ProductFilters } from "@/lib/db";

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Parse a Next.js `searchParams` object into a typed ProductFilters value.
 * Accepts repeated `?attr=color:black&attr=size:m` style facets and groups
 * them by attribute code so the repository can apply correct OR-within /
 * AND-across semantics.
 *
 * Unrecognized values are dropped silently — never throw on bad URL params,
 * just degrade to "no filter".
 */
export function parseShopSearchParams(
  sp: RawSearchParams,
  fallback: { categorySlug?: string } = {},
): ProductFilters & { page: number; pageSize: number } {
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const category =
    fallback.categorySlug ??
    (typeof sp.category === "string" ? sp.category : undefined);

  const brandSlugs = readArray(sp.brand);

  const attributes = parseAttributeFacets(readArray(sp.attr));

  const minPriceRupees = Number(typeof sp.minPrice === "string" ? sp.minPrice : "");
  const maxPriceRupees = Number(typeof sp.maxPrice === "string" ? sp.maxPrice : "");
  const minPriceMinor =
    Number.isFinite(minPriceRupees) && minPriceRupees > 0
      ? BigInt(Math.round(minPriceRupees * 100))
      : undefined;
  const maxPriceMinor =
    Number.isFinite(maxPriceRupees) && maxPriceRupees > 0
      ? BigInt(Math.round(maxPriceRupees * 100))
      : undefined;

  const inStockOnly =
    sp.inStock === "true" || sp.inStock === "1" ||
    sp.inStockOnly === "true" || sp.inStockOnly === "1";

  const sortRaw = typeof sp.sort === "string" ? sp.sort : "relevance";
  const sort = (
    ["relevance", "newest", "price-asc", "price-desc"].includes(sortRaw)
      ? sortRaw
      : "relevance"
  ) as ProductFilters["sort"];

  const page = Math.max(
    1,
    Number(typeof sp.page === "string" ? sp.page : 1) || 1,
  );
  const pageSize = 12;

  return {
    q: q || undefined,
    categorySlug: category,
    brandSlugs: brandSlugs.length > 0 ? brandSlugs : undefined,
    attributes: attributes.length > 0 ? attributes : undefined,
    minPriceMinor,
    maxPriceMinor,
    inStockOnly,
    sort,
    page,
    pageSize,
  };
}

function readArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Convert flat list `["color:black", "color:red", "size:m"]` into the
 * grouped shape the repository expects. Empty/garbage entries are skipped.
 */
function parseAttributeFacets(
  raw: string[],
): Array<{ code: string; values: string[] }> {
  const groups = new Map<string, string[]>();
  for (const item of raw) {
    const [code, value] = item.split(":");
    if (!code || !value) continue;
    const arr = groups.get(code) ?? [];
    if (!arr.includes(value)) arr.push(value);
    groups.set(code, arr);
  }
  return [...groups.entries()].map(([code, values]) => ({ code, values }));
}
