import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/ui/reveal";
import { HomeHero, type HeroProduct } from "@/components/home/hero";
import { CategoryCard } from "@/components/category/category-card";
import {
  parseHeroConfig,
  HERO_SETTING_KEYS,
  HERO_DESIGNS_USING_PRODUCT,
} from "@ecom/shared/hero";
import { productRepo, prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, categories, heroSettings] = await Promise.all([
    productRepo.listFeaturedProducts(8),
    productRepo.listCategories(),
    prisma.setting.findMany({
      where: {
        scope: "PLATFORM",
        vendorId: null,
        key: { in: Object.values(HERO_SETTING_KEYS) },
      },
    }),
  ]);

  const settingByKey = new Map(heroSettings.map((s) => [s.key, s.value]));
  const heroConfig = parseHeroConfig({
    design: settingByKey.get(HERO_SETTING_KEYS.design),
    productId: settingByKey.get(HERO_SETTING_KEYS.productId),
    text: settingByKey.get(HERO_SETTING_KEYS.text),
  });

  // Only image-based designs need the (potentially expensive) product lookup.
  const designUsesProduct = HERO_DESIGNS_USING_PRODUCT.includes(heroConfig.design);
  const heroProductRow =
    designUsesProduct && heroConfig.productId
      ? await prisma.product.findUnique({
          where: { id: heroConfig.productId, status: "ACTIVE", deletedAt: null },
          include: {
            brand: { select: { name: true } },
            media: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 },
            variants: {
              where: { deletedAt: null },
              include: { prices: { take: 1, orderBy: { updatedAt: "desc" } } },
            },
          },
        })
      : null;

  const heroProduct: HeroProduct | null = heroProductRow
    ? {
        name: heroProductRow.name,
        slug: heroProductRow.slug,
        brandName: heroProductRow.brand?.name ?? null,
        imageUrl: heroProductRow.media[0]?.url ?? null,
        priceLabel: heroProductRow.variants[0]?.prices[0]
          ? formatPrice(
              heroProductRow.variants[0].prices[0].amountMinor,
              heroProductRow.variants[0].prices[0].currency,
            )
          : null,
      }
    : null;

  const quickLinks = categories.slice(0, 4).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  return (
    <div>
      <HomeHero
        design={heroConfig.design}
        text={heroConfig.text}
        product={heroProduct}
        quickLinks={quickLinks}
      />

      <Reveal>
        <section className="container-page mt-24 md:mt-32">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">
                Featured
              </p>
              <h2 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
                Handpicked,{" "}
                <span className="italic text-muted-foreground">this season.</span>
              </h2>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/shop">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {featured.length === 0 ? (
            <EmptyShelf />
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {featured.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.05} y={16}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      <Reveal>
        <section className="container-page mt-32">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">
                Collections
              </p>
              <h2 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
                Three worlds.{" "}
                <span className="italic text-muted-foreground">One shelf.</span>
              </h2>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/categories">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {categories.slice(0, 3).map((c, i) => (
              <Reveal key={c.id} delay={i * 0.08} y={20}>
                <CategoryCard category={c} />
              </Reveal>
            ))}
          </div>

          {categories.length > 3 ? (
            <div className="mt-8 flex justify-center sm:hidden">
              <Button asChild variant="outline">
                <Link href="/categories">
                  View all categories <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : null}
        </section>
      </Reveal>

      <Reveal>
        <section className="container-page mt-32">
          <div className="grid gap-10 rounded-3xl border bg-muted p-10 md:grid-cols-2 md:p-16">
            <div>
              <p className="text-sm uppercase tracking-widest text-muted-foreground">
                Built different
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
                Materials,{" "}
                <span className="italic text-muted-foreground">
                  not marketing.
                </span>
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Every product on this shelf earns its place. We pick the makers
                who care about the gram, the millisecond, and the thread.
              </p>
              <div className="mt-8 flex gap-3">
                <Button asChild>
                  <Link href="/shop">Shop the shelf</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/about">Our story</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600",
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
                "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600",
                "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600",
                "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=600",
                "https://images.unsplash.com/photo-1542435503-956c469947f6?w=600",
              ].map((src, i) => (
                <Reveal key={src} delay={i * 0.04} y={12}>
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="20vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

function EmptyShelf() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed bg-muted p-12 text-center">
      <p className="text-sm font-medium">No products yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Run{" "}
        <code className="rounded bg-background px-1.5 py-0.5">
          npm run db:seed
        </code>{" "}
        to load the demo catalog.
      </p>
    </div>
  );
}
