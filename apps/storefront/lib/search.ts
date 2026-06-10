/**
 * Postgres-backed search facade. Used by both the live search dialog
 * (Cmd+K) and the /search page. The actual query logic lives in
 * productRepo.findProducts — this module exists to keep the call sites
 * thin and to provide a single typed surface the storefront depends on.
 */
import { productRepo } from "@/lib/db";

export type StorefrontSearchInput = {
  q: string;
  page?: number;
  hitsPerPage?: number;
  category?: string;
  brandSlugs?: string[];
  attributes?: Array<{ code: string; values: string[] }>;
  minPriceMinor?: bigint;
  maxPriceMinor?: bigint;
  inStockOnly?: boolean;
  sort?: "relevance" | "newest" | "price-asc" | "price-desc";
};

export type StorefrontSearchResult = {
  ok: true;
  hits: Awaited<ReturnType<typeof productRepo.findProducts>>["items"];
  totalHits: number;
  page: number;
  hitsPerPage: number;
  facets: Awaited<ReturnType<typeof productRepo.findProducts>>["facets"];
  /** Spelling-corrected variant of the query, or null when no fix found. */
  suggestion: string | null;
  processingTimeMs: number;
};

export async function searchStorefront(
  input: StorefrontSearchInput,
): Promise<StorefrontSearchResult> {
  const t0 = Date.now();
  const result = await productRepo.findProducts({
    q: input.q,
    categorySlug: input.category,
    brandSlugs: input.brandSlugs,
    attributes: input.attributes,
    minPriceMinor: input.minPriceMinor,
    maxPriceMinor: input.maxPriceMinor,
    inStockOnly: input.inStockOnly,
    sort: input.sort,
    page: input.page ?? 1,
    pageSize: input.hitsPerPage ?? 12,
  });
  return {
    ok: true,
    hits: result.items,
    totalHits: result.totalCount,
    page: result.page,
    hitsPerPage: result.pageSize,
    facets: result.facets,
    suggestion: result.suggestion,
    processingTimeMs: Date.now() - t0,
  };
}
