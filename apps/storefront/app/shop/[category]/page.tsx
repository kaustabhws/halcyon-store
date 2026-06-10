import { Suspense } from "react";
import { notFound } from "next/navigation";
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

type Params = { category: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { category: slug } = await params;
  const c = await productRepo.getCategoryBySlug(slug);
  return c ? { title: c.name } : { title: "Not found" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { category: slug } = await params;
  const [category, sp] = await Promise.all([
    productRepo.getCategoryBySlug(slug),
    searchParams,
  ]);
  if (!category) notFound();

  const filters = parseShopSearchParams(sp, { categorySlug: slug });
  const result = await productRepo.findProducts(filters);
  const totalPages = Math.max(
    1,
    Math.ceil(result.totalCount / result.pageSize),
  );

  return (
    <div className="container-page py-12 md:py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Collection
        </p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="max-w-xl text-muted-foreground">{category.description}</p>
        ) : null}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <Suspense>
          <ShopFilters facets={result.facets} fixedCategorySlug={slug} />
        </Suspense>

        <section className="space-y-6">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Suspense>
              <ShopFiltersDrawer
                facets={result.facets}
                fixedCategorySlug={slug}
              />
            </Suspense>
          </div>

          <Suspense>
            <ShopSortBar totalCount={result.totalCount} />
          </Suspense>

          <Suspense>
            <ActiveFilterChips facets={result.facets} />
          </Suspense>

          {result.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              Nothing in this collection matches these filters.
            </div>
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
