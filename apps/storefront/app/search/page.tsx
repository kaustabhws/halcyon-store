import { Suspense } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import {
  ShopFilters,
  ShopFiltersDrawer,
  ShopSortBar,
  ShopPager,
  ActiveFilterChips,
} from "@/components/shop/shop-filters";
import { SearchQueryForm } from "@/components/search/search-query-form";
import { searchStorefront } from "@/lib/search";
import { parseShopSearchParams, type RawSearchParams } from "@/lib/shop-params";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  return {
    title: sp.q ? `Search · ${sp.q}` : "Search",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseShopSearchParams(sp);
  const q = filters.q ?? "";

  const result = await searchStorefront({
    q,
    category: filters.categorySlug,
    brandSlugs: filters.brandSlugs,
    attributes: filters.attributes,
    minPriceMinor: filters.minPriceMinor,
    maxPriceMinor: filters.maxPriceMinor,
    inStockOnly: filters.inStockOnly,
    sort: filters.sort,
    page: filters.page,
    hitsPerPage: filters.pageSize,
  });

  const totalPages = Math.max(
    1,
    Math.ceil(result.totalHits / result.hitsPerPage),
  );

  return (
    <div className="container-page py-10 md:py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Search
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {q ? `Results for “${q}”` : "Search the shelf"}
        </h1>
        <Suspense>
          <SearchQueryForm initialQuery={q} />
        </Suspense>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <Suspense>
          <ShopFilters facets={result.facets} />
        </Suspense>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Suspense>
              <ShopFiltersDrawer facets={result.facets} />
            </Suspense>
          </div>

          <Suspense>
            <ShopSortBar
              totalCount={result.totalHits}
              processingTimeMs={result.processingTimeMs}
            />
          </Suspense>

          <Suspense>
            <ActiveFilterChips facets={result.facets} />
          </Suspense>

          {result.hits.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              <p>
                No results
                {q ? (
                  <>
                    {" "}
                    for &ldquo;<span className="font-medium text-foreground">{q}</span>&rdquo;
                  </>
                ) : (
                  " match these filters"
                )}
                .
              </p>
              {result.suggestion ? (
                <p>
                  Did you mean{" "}
                  <Link
                    href={`/search?q=${encodeURIComponent(result.suggestion)}`}
                    className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
                  >
                    {result.suggestion}
                  </Link>
                  ?
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
              {result.hits.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <Suspense>
            <ShopPager page={result.page} totalPages={totalPages} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
