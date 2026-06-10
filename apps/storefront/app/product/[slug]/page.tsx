import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { productRepo, wishlistRepo } from "@/lib/db";
import { PdpClient } from "@/components/product/pdp-client";
import { Separator } from "@/components/ui/separator";
import { ProductCard } from "@/components/product/product-card";
import { ReviewSection } from "@/components/reviews/review-section";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const p = await productRepo.getProductBySlug(slug);
  return p
    ? {
        title: p.name,
        description: p.shortDescription ?? undefined,
        openGraph: {
          title: p.name,
          description: p.shortDescription ?? undefined,
          images: p.primaryImageUrl ? [p.primaryImageUrl] : [],
        },
      }
    : { title: "Not found" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await productRepo.getProductBySlug(slug);
  if (!product) notFound();

  const session = await auth();
  const customerId = session?.user?.id ?? null;
  const inWishlist = customerId
    ? await wishlistRepo.isInWishlist(customerId, product.id)
    : false;

  // Same-category recommendations
  const recs = product.categories[0]
    ? (await productRepo.listProducts({
        categorySlug: product.categories[0].slug,
        pageSize: 8,
      })).items.filter((p) => p.id !== product.id).slice(0, 4)
    : [];

  return (
    <div className="container-page py-12 md:py-20">
      <nav className="mb-8 text-sm text-zinc-500">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        {product.categories[0] ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/shop/${product.categories[0].slug}`}
              className="hover:text-foreground"
            >
              {product.categories[0].name}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <PdpClient
        product={product}
        wishlist={{ isAuthed: Boolean(customerId), inWishlist }}
      />

      {product.description ? (
        <section className="mt-20 grid gap-12 md:grid-cols-[1fr_2fr]">
          <h2 className="text-2xl font-semibold tracking-tight">Details</h2>
          <p className="text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
            {product.description}
          </p>
        </section>
      ) : null}

      {product.specifications.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">Specifications</h2>
          <dl className="mt-6 grid gap-x-12 gap-y-3 sm:grid-cols-2">
            {product.specifications.map((s) => (
              <div key={s.key} className="flex justify-between border-b border-zinc-200 py-3 dark:border-zinc-800">
                <dt className="text-sm text-zinc-500">{s.key}</dt>
                <dd className="text-sm font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <ReviewSection productId={product.id} productName={product.name} />

      {recs.length > 0 ? (
        <section className="mt-24">
          <Separator className="mb-12" />
          <h2 className="text-2xl font-semibold tracking-tight">You may also like</h2>
          <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {recs.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
