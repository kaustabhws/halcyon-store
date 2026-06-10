import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/ui/reveal";
import { BRAND } from "@ecom/shared/brand";
import { productRepo, prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";

const CATEGORY_HERO: Record<
  string,
  { title: string; image: string; tagline: string }
> = {
  sneakers: {
    title: "Sneakers",
    tagline: "Performance and lifestyle, in motion.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200",
  },
  watches: {
    title: "Watches",
    tagline: "Time, quietly considered.",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1200",
  },
  headphones: {
    title: "Headphones",
    tagline: "A canvas for sound.",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1200",
  },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, categories, heroSetting] = await Promise.all([
    productRepo.listFeaturedProducts(8),
    productRepo.listCategories(),
    prisma.setting.findFirst({
      where: { scope: "PLATFORM", vendorId: null, key: "homepage.heroProductId" },
    }),
  ]);

  const heroProductId = heroSetting?.value
    ? String(heroSetting.value).replace(/"/g, "")
    : null;
  const heroProduct = heroProductId
    ? await prisma.product.findUnique({
        where: { id: heroProductId, status: "ACTIVE", deletedAt: null },
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

  const heroImage = heroProduct?.media[0]?.url ?? null;
  const heroPrice = heroProduct?.variants[0]?.prices[0]?.amountMinor ?? null;
  const heroCurrency = heroProduct?.variants[0]?.prices[0]?.currency ?? "INR";

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-white">
        <div className="container-page relative z-10 flex min-h-[70vh] flex-col items-center justify-center py-24 text-center md:min-h-[80vh]">
          {heroProduct ? (
            <>
              <Reveal>
                <p className="text-sm uppercase tracking-widest text-zinc-500 dark:text-white/60">
                  {heroProduct.brand?.name ?? BRAND.name}
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="mt-6 font-display text-5xl tracking-tight sm:text-6xl md:text-7xl">
                  {heroProduct.name}
                </h1>
              </Reveal>
              {heroPrice ? (
                <Reveal delay={0.15}>
                  <p className="mt-4 text-2xl font-semibold tabular-nums text-zinc-800 dark:text-white/90">
                    {formatPrice(heroPrice, heroCurrency)}
                  </p>
                </Reveal>
              ) : null}
              <Reveal delay={0.2}>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button asChild size="lg">
                    <Link href={`/product/${heroProduct.slug}`}>Shop now</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                  >
                    <Link href="/shop">Browse all</Link>
                  </Button>
                </div>
              </Reveal>
              {heroImage ? (
                <Reveal delay={0.25}>
                  <div className="relative mx-auto mt-12 aspect-4/3 w-full max-w-lg overflow-hidden rounded-2xl">
                    <Image
                      src={heroImage}
                      alt={heroProduct.name}
                      fill
                      priority
                      sizes="(min-width: 768px) 512px, 90vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
              ) : null}
            </>
          ) : (
            <>
              <Reveal>
                <p className="text-sm uppercase tracking-widest text-zinc-500 dark:text-white/60">
                  {BRAND.tagline}
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="mt-6 font-display text-5xl tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                  Designed for<br />
                  <span className="italic text-zinc-400 dark:text-white/60">clarity.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-6 max-w-lg text-base text-zinc-600 dark:text-white/60 md:text-lg">
                  Sneakers, watches, headphones — three categories, no compromises.
                  Each product earns its place on the shelf.
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  <Button asChild size="lg">
                    <Link href="/shop">Shop the shelf</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                  >
                    <Link href="/shop/sneakers">New arrivals</Link>
                  </Button>
                </div>
              </Reveal>
            </>
          )}
        </div>
        {/* Ambient gradient backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.03),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04),transparent_70%)]" />
      </section>

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
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            Collections
          </p>
          <h2 className="mt-2 font-display text-4xl tracking-tight md:text-5xl">
            Three worlds.{" "}
            <span className="italic text-muted-foreground">One shelf.</span>
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {categories.map((c, i) => {
              const meta = CATEGORY_HERO[c.slug];
              return (
                <Reveal key={c.id} delay={i * 0.08} y={20}>
                  <Link
                    href={`/shop/${c.slug}`}
                    className="group relative block aspect-4/5 overflow-hidden rounded-3xl bg-muted"
                  >
                    {meta?.image ? (
                      <Image
                        src={meta.image}
                        alt={meta.title}
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute inset-x-6 bottom-6 text-white">
                      <p className="text-xs uppercase tracking-widest opacity-80">
                        {meta?.tagline ?? c.description}
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold tracking-tight">
                        {meta?.title ?? c.name}
                      </h3>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm">
                        Explore{" "}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
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
