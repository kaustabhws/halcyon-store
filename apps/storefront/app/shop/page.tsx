import { Suspense } from "react";
import { ProductCard } from "@/components/product/product-card";
import {
  ShopFilters,
  ShopFiltersDrawer,
  ShopSortBar,
  ShopPager,
  ActiveFilterChips,
} from "@/components/shop/shop-filters";
import { productRepo } from "@/lib/db";
import { parseShopSearchParams, type RawSearchParams } from "@/lib/shop-params";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseShopSearchParams(sp);
  const result = await productRepo.findProducts(filters);
  const totalPages = Math.max(
    1,
    Math.ceil(result.totalCount / result.pageSize),
  );

  return (
    <div className="container-page py-12 md:py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          All products
        </p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          The full shelf.
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Sneakers, watches, headphones, side by side.
        </p>
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
            <ShopSortBar totalCount={result.totalCount} />
          </Suspense>

          <Suspense>
            <ActiveFilterChips facets={result.facets} />
          </Suspense>

          {result.items.length === 0 ? (
            <Empty />
          ) : (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
              {result.items.map((p) => (
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

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed p-12 text-center">
      <p className="text-sm font-medium">Nothing matches these filters.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Try clearing a filter or two.
      </p>
    </div>
  );
}
