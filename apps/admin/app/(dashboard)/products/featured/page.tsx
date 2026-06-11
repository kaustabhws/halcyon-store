import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeaturedToggle } from "@/components/products/featured-toggle";
import { HeroConfigForm } from "@/components/products/hero-config-form";
import { parseHeroConfig, HERO_SETTING_KEYS } from "@ecom/shared/hero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Featured Products" };

export default async function FeaturedPage() {
  const [products, heroSettings] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      include: {
        brand: { select: { name: true } },
        media: {
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 1,
        },
      },
    }),
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

  const featured = products.filter((p) => p.isFeatured);
  const notFeatured = products.filter((p) => !p.isFeatured);

  return (
    <div className="space-y-8 p-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Storefront
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Featured &amp; Hero
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Control which products appear on the homepage and in what order.
          Featured products show in the "Handpicked" grid. The hero product
          gets a prominent banner position.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Homepage hero</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Choose a hero design and edit its content. Image designs feature the
            selected hero product; text designs use the editable copy below.
          </p>
          <HeroConfigForm
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              brandName: p.brand?.name ?? null,
            }))}
            initial={heroConfig}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Featured products{" "}
            <Badge variant="outline" className="ml-2">
              {featured.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {featured.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No featured products. Toggle the switch on any product below to
              feature it on the homepage.
            </p>
          ) : (
            <ul className="divide-y">
              {featured.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {p.media[0]?.url ? (
                      <Image
                        src={p.media[0].url}
                        alt={p.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${p.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.brand ? (
                      <p className="text-xs text-muted-foreground">
                        {p.brand.name}
                      </p>
                    ) : null}
                  </div>
                  <FeaturedToggle productId={p.id} isFeatured={true} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            All products{" "}
            <Badge variant="outline" className="ml-2">
              {notFeatured.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {notFeatured.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.media[0]?.url ? (
                    <Image
                      src={p.media[0].url}
                      alt={p.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${p.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {p.name}
                  </Link>
                  {p.brand ? (
                    <p className="text-xs text-muted-foreground">
                      {p.brand.name}
                    </p>
                  ) : null}
                </div>
                <FeaturedToggle productId={p.id} isFeatured={false} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
